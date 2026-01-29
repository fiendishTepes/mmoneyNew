class UIRenderer {
    constructor() {
        this.list = document.getElementById('list');
        this.balance = document.getElementById('balanceDisplay');
        this.income = document.getElementById('incomeDisplay');
        this.expense = document.getElementById('expenseDisplay');
        this.currentDateDisplay = document.getElementById('currentDateDisplay');
        this.emptyState = document.getElementById('emptyState');

        // Report Elements
        this.reportList = document.getElementById('reportList');
        this.reportIncome = document.getElementById('reportIncome');
        this.reportExpense = document.getElementById('reportExpense');
        this.reportBalance = document.getElementById('reportBalance');

        this.currentBalance = 0;
    }

    applySettings(settings) {
        document.body.className = settings.fontSize || 'font-medium';
        const theme = settings.theme || 'light';
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        const icon = document.querySelector('#themeToggle i');
        if(theme === 'dark'){
            icon.className = 'fas fa-sun';
            icon.parentElement.classList.replace('btn-outline-secondary', 'btn-outline-warning');
        } else {
            icon.className = 'fas fa-moon';
            icon.parentElement.classList.replace('btn-outline-warning', 'btn-outline-secondary');
        }
    }

    // --- 1. Dashboard Logic (เฉพาะวันนี้) ---
    updateDashboard(todayTransactions) {
        // Show Current Date Text
        const today = new Date();
        this.currentDateDisplay.innerText = today.toLocaleDateString('th-TH', { 
            weekday: 'short', day: 'numeric', month: 'short'
        });

        // Calculate Totals
        const amounts = todayTransactions.map(t => t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount));
        const total = amounts.reduce((acc, item) => acc + item, 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
        const expense = (amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1);

        // Animate Balance
        this.animateValue(this.balance, this.currentBalance, total, 800);
        this.currentBalance = total;

        this.income.innerText = `+${this.formatMoney(income)}`;
        this.expense.innerText = `-${this.formatMoney(expense)}`;
    }

    // --- 2. Main List Logic (ล่าสุด 10 รายการ) ---
    renderRecentTransactions(transactions, onDeleteCallback) {
        this.list.innerHTML = '';
        
        // Sort descending by date
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Slice top 10
        const recentTx = transactions.slice(0, 10);

        if (recentTx.length === 0) {
            this.emptyState.classList.remove('d-none');
            return;
        } 
        
        this.emptyState.classList.add('d-none');
        recentTx.forEach(tx => {
            this.list.appendChild(this.createTransactionElement(tx, onDeleteCallback, false));
        });
    }

    // --- 3. Report List Logic (Modal) ---
    renderReportList(transactions) {
        this.reportList.innerHTML = '';
        
        // Calculate Report Totals
        const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        
        this.reportIncome.innerText = `+${this.formatMoney(income)}`;
        this.reportExpense.innerText = `-${this.formatMoney(expense)}`;
        this.reportBalance.innerText = `${this.formatMoney(income - expense)}`;

        if(transactions.length === 0) {
            this.reportList.innerHTML = '<li class="list-group-item text-center text-muted bg-transparent border-0">ไม่พบรายการในช่วงเวลานี้</li>';
            return;
        }

        // Render Items (Sort desc)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        transactions.forEach(tx => {
            this.reportList.appendChild(this.createTransactionElement(tx, null, true));
        });
    }

    // --- 4. Summary Report (Monthly/Yearly) ---
    renderSummaryReport(dataList) {
        this.reportList.innerHTML = '';
        
        let totalIncome = 0;
        let totalExpense = 0;

        dataList.forEach(item => {
            totalIncome += item.income;
            totalExpense += item.expense;

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center bg-transparent';
            li.innerHTML = `
                <div>
                    <div class="fw-bold">${item.title}</div>
                </div>
                <div class="text-end" style="font-size: 0.9em;">
                    <span class="text-success d-block">+${this.formatMoney(item.income)}</span>
                    <span class="text-danger d-block">-${this.formatMoney(item.expense)}</span>
                    <small class="text-muted fw-bold d-block mt-1 pt-1 border-top border-secondary border-opacity-25">คงเหลือ ${this.formatMoney(item.net)}</small>
                </div>
            `;
            this.reportList.appendChild(li);
        });

        this.reportIncome.innerText = `+${this.formatMoney(totalIncome)}`;
        this.reportExpense.innerText = `-${this.formatMoney(totalExpense)}`;
        this.reportBalance.innerText = `${this.formatMoney(totalIncome - totalExpense)}`;

        if(dataList.length === 0) {
            this.reportList.innerHTML = '<li class="list-group-item text-center text-muted bg-transparent border-0">ไม่มีข้อมูลในปีนี้</li>';
        }
    }

    // Helper: Create List Item HTML
    createTransactionElement(transaction, onDeleteCallback, isReport) {
        const isExpense = transaction.type === 'expense';
        const sign = isExpense ? '-' : '+';
        const colorClass = isExpense ? 'text-danger' : 'text-success';
        const bgClass = isExpense ? 'bg-danger' : 'bg-success';
        const icon = isExpense ? 'fa-shopping-bag' : 'fa-sack-dollar';

        const item = document.createElement('li');
        item.className = `list-group-item d-flex justify-content-between align-items-center fade-in-effect`;
        if(isReport) item.classList.add('bg-transparent'); // No white bg in modal

        item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-2 rounded-circle ${bgClass} bg-opacity-10 ${colorClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div>
                    <div class="fw-bold">${transaction.text}</div>
                    <small class="text-muted" style="font-size: 0.8em;">
                        ${new Date(transaction.date).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} น.
                        ${isReport ? `(${new Date(transaction.date).toLocaleDateString('th-TH', {day:'numeric', month:'short'})})` : ''}
                    </small>
                </div>
            </div>
            <div class="text-end">
                <div class="fw-bold ${colorClass}">${sign}${this.formatMoney(transaction.amount)}</div>
                ${!isReport ? `<button class="btn btn-link text-secondary p-0 delete-btn" style="font-size:0.8em;"><i class="fas fa-trash-alt me-1"></i>ลบ</button>` : ''}
            </div>
        `;

        if (!isReport && onDeleteCallback) {
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                onDeleteCallback(transaction.id);
            });
        }
        return item;
    }

    animateValue(obj, start, end, duration) {
        if (start === end) { obj.innerHTML = this.formatMoney(end); return; }
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = start + (progress * (end - start));
            obj.innerHTML = this.formatMoney(value);
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    formatMoney(num) {
        return Number(num).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    showNotification(title, icon = 'success') {
        Swal.fire({
            toast: true, position: 'top-end', icon: icon, title: title,
            showConfirmButton: false, timer: 1500, timerProgressBar: true,
            background: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#333' : '#fff',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#fff' : '#333'
        });
    }
}