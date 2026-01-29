class ExpenseModel {
    constructor() {
        this.dbName = 'JarvisExpenseDB';
        this.storeName = 'transactions';
        this.db = null;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    this.db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject('Database error: ' + event.target.errorCode);
            };
        });
    }

    async addTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.add(transaction);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject();
        });
    }

    async getAllTransactions() {
        return new Promise((resolve) => {
            if(!this.db) return resolve([]);
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async deleteTransaction(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.delete(id);
            tx.oncomplete = () => resolve();
        });
    }
}