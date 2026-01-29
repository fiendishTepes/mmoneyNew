class AppController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.modalAddInstance = null;
        this.modalReportInstance = null;
        this.init();
    }

    async init() {
        try {
            await this.model.initDB();
            
            // Init Bootstrap Modals
            const addModalEl = document.getElementById('addModal');
            if(addModalEl) this.modalAddInstance = new bootstrap.Modal(addModalEl);
            
            const reportModalEl = document.getElementById('reportModal');
            if(reportModalEl) this.modalReportInstance = new bootstrap.Modal(reportModalEl);

            this.loadSettings();
            this.refreshData();
            
            // Event Listeners
            const form = document.getElementById('transactionForm');
            if(form) form.addEventListener('submit', (e) => this.addTransaction(e));

            // Date Picker Change Event (For Daily Report)
            document.getElementById('reportDateInput').addEventListener('change', (e) => {
                this.generateDailyReport(e.target.value);
            });

        } catch (error) {
            console.error("Initialization Failed:", error);
            this.view.showNotification("ระบบเริ่มต้นล้มเหลว", "error");
        }
    }

    loadSettings() {
        const savedFont = localStorage.getItem('jarvis_font_size') || 'font-medium';
        const savedTheme = localStorage.getItem('jarvis_theme') || 'light';
        this.view.applySettings({ fontSize: savedFont, theme: savedTheme });
    }

    changeFontSize(sizeClass) {
        localStorage.setItem('jarvis_font_size', sizeClass);
        this.loadSettings();
    }

    toggleTheme() {
        const currentTheme = localStorage.getItem('jarvis_theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('jarvis_theme', newTheme);
        this.loadSettings();
    }

    async refreshData() {
        const allTransactions = await this.model.getAllTransactions();
        
        // 1. Filter for Dashboard (Today ONLY)
        const todayStr = new Date().toDateString(); // "Fri Jan 30 2026"
        const todayTx = allTransactions.filter(t => new Date(t.date).toDateString() === todayStr);
        
        this.view.updateDashboard(todayTx);

        // 2. Send all data to render list (View will slice top 10)
        this.view.renderRecentTransactions(allTransactions, (id) => this.deleteTransaction(id));
    }

    async addTransaction(e) {
        e.preventDefault();
        const text = document.getElementById('text').value;
        const amount = +document.getElementById('amount').value;
        const type = document.querySelector('input[name="type"]:checked')?.value || 'expense';

        if(text.trim() === '' || amount === 0) {
            this.view.showNotification('กรุณากรอกข้อมูล', 'warning');
            return;
        }

        const transaction = {
            text,
            amount,
            type,
            date: new Date().toISOString()
        };

        await this.model.addTransaction(transaction);
        
        if(this.modalAddInstance) this.modalAddInstance.hide();
        document.getElementById('transactionForm').reset();
        document.getElementById('type-expense').checked = true;

        this.view.showNotification('บันทึกสำเร็จ');
        this.refreshData();
    }

    async deleteTransaction(id) {
        const result = await Swal.fire({
            title: 'ยืนยันลบ?', text: "ลบแล้วกู้คืนไม่ได้นะเจ้านาย", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'ลบเลย',
            background: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#1e1e1e' : '#fff',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#fff' : '#333'
        });

        if (result.isConfirmed) {
            await this.model.deleteTransaction(id);
            this.view.showNotification('ลบข้อมูลแล้ว', 'info');
            this.refreshData();
        }
    }

    // --- Report System Logic ---
    async openReport(type) {
        const allTx = await this.model.getAllTransactions();
        const title = document.getElementById('reportTitle');
        const dateContainer = document.getElementById('datePickerContainer');
        const dateInput = document.getElementById('reportDateInput');

        if (type === 'daily') {
            title.innerText = 'ประวัติรายวัน';
            dateContainer.classList.remove('d-none');
            // Set default to today
            const todayISO = new Date().toISOString().split('T')[0];
            dateInput.value = todayISO;
            this.generateDailyReport(todayISO);
        } else if (type === 'monthly') {
            title.innerText = `สรุปรายเดือน (ปี ${new Date().getFullYear() + 543})`;
            dateContainer.classList.add('d-none');
            this.generateMonthlyReport(allTx);
        } else if (type === 'yearly') {
            title.innerText = 'สรุปรายปี';
            dateContainer.classList.add('d-none');
            this.generateYearlyReport(allTx);
        }

        this.modalReportInstance.show();
    }

    async generateDailyReport(dateString) {
        const allTx = await this.model.getAllTransactions();
        // dateString comes as "YYYY-MM-DD"
        const targetDateStr = new Date(dateString).toDateString();
        
        const filtered = allTx.filter(t => new Date(t.date).toDateString() === targetDateStr);
        this.view.renderReportList(filtered);
    }

    generateMonthlyReport(allTx) {
        const currentYear = new Date().getFullYear();
        // Array 0-11 for months
        const monthlyStats = Array(12).fill(null).map(() => ({ income: 0, expense: 0, count: 0 }));

        allTx.forEach(t => {
            const d = new Date(t.date);
            if(d.getFullYear() === currentYear) {
                const m = d.getMonth();
                if(t.type === 'income') monthlyStats[m].income += t.amount;
                else monthlyStats[m].expense += t.amount;
                monthlyStats[m].count++;
            }
        });

        const reportData = monthlyStats.map((stat, index) => {
            if(stat.count === 0) return null;
            return {
                title: new Date(currentYear, index).toLocaleDateString('th-TH', { month: 'long' }),
                income: stat.income,
                expense: stat.expense,
                net: stat.income - stat.expense
            };
        }).filter(x => x !== null);

        this.view.renderSummaryReport(reportData);
    }

    generateYearlyReport(allTx) {
        const yearlyStats = {};
        allTx.forEach(t => {
            const y = new Date(t.date).getFullYear();
            if(!yearlyStats[y]) yearlyStats[y] = { income: 0, expense: 0 };
            
            if(t.type === 'income') yearlyStats[y].income += t.amount;
            else yearlyStats[y].expense += t.amount;
        });

        const reportData = Object.keys(yearlyStats).map(year => ({
            title: `ปี ${parseInt(year) + 543}`,
            income: yearlyStats[year].income,
            expense: yearlyStats[year].expense,
            net: yearlyStats[year].income - yearlyStats[year].expense
        })).sort((a,b) => b.title.localeCompare(a.title)); // Sort years desc

        this.view.renderSummaryReport(reportData);
    }

    async exportData() {
        const data = await this.model.getAllTransactions();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `jarvis_wallet_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.view.showNotification('Export เรียบร้อย');
    }
}

const app = new AppController(new ExpenseModel(), new UIRenderer());