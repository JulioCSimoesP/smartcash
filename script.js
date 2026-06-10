/* Services */

const StorageService = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
};

const SettingsService = {
    getItemsPerPage() {
        const itemsPerPage = StorageService.get('itemsPerPage');
        return itemsPerPage ? parseInt(itemsPerPage, 10) : 10;
    },

    setItemsPerPage(value) {
        StorageService.save('itemsPerPage', value);
    }
};

const ModelService = {
    createTransaction(data) {
        return {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            /* Comentado para testes em mobile. Descomentar após testes */
            //id: crypto.randomUUID(),
            description: data.description,
            amount: data.amount,
            date: data.date,
            categoryId: data.categoryId
        };
    },

    createCategory(data) {
        return {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            /* Comentado para testes em mobile. Descomentar após testes */
            //id: crypto.randomUUID(),
            name: data.name,
            iconId: data.iconId || 'default-icon',
            type: data.type,
            isDefault: data.isDefault || false
        };
    }
};

const Utils = {
    formatCurrency: (cents) => {
        return (cents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    parseCurrency: (value) => {
        const outputValue = parseInt(value.replace(/\D/g, ''), 10);

        if (isNaN(outputValue)) {
            return 0;
        }

        return outputValue;
    },

    formatMonthYear: (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    },

};

const IconHelper = {
    getIconById(id) {
        const iconObject = CATEGORY_ICON_LIBRARY.find(icon => icon.id === id) || CATEGORY_ICON_LIBRARY.find(icon => icon.id === 'default-icon');
        return iconObject.svg;
    },

    iconExists(id) {
        return CATEGORY_ICON_LIBRARY.some(icon => icon.id === id);
    },
}

const SanitizationService = {
    stripHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    cleanDate(dateString) {
        const date = new Date(dateString);

        if (dateString && !isNaN(date.getTime())) {
            return dateString;
        }

        return DateService.getToday();
    },

    cleanTransactionType(value) {
        if (value === 'income') return true;
        if (value === 'outcome') return false;
        return false;
    },

    cleanCategoryType(value) {
        if (value === 'income') return 'income';
        if (value === 'outcome') return 'outcome';
        return 'both';
    },

    cleanTransaction(data) {
        const rawAmount = Math.abs(Utils.parseCurrency(data.amount) || 0);
        const isIncome = this.cleanTransactionType(data.type);
        const finalAmount = isIncome ? rawAmount : -rawAmount;

        return {
            description: this.stripHTML(data.description || '').trim(),
            amount: finalAmount,
            date: this.cleanDate(data.date),
            categoryId: this.stripHTML(data.categoryId || '').trim()
        };
    },

    cleanCategory(data) {
        return {
            name: this.stripHTML(data.name || '').trim(),
            iconId: this.stripHTML(data.iconId || '').trim(),
            type: this.cleanCategoryType(data.type),
            isDefault: false
        };
    }
};

const ValidationService = {
    validateTransaction(data) {
        const errors = [];
        const MAX_DESC_LENGTH = 50;

        if (!data.description || data.description.length < 3) {
            errors.push("A descrição deve ter pelo menos 3 caracteres.");
        }

        if (data.description.length > MAX_DESC_LENGTH) {
            errors.push(`A descrição não pode ter mais de ${MAX_DESC_LENGTH} caracteres.`);
        }

        if (isNaN(data.amount) || data.amount === 0) {
            errors.push("O valor deve ser um número e deve ser diferente de zero.");
        }

        const today = DateService.getToday();
        if (data.date > today) {
            errors.push("Não é permitido registrar transações com datas futuras.");
        }

        const categories = CategoryService.getAllCategories();
        const categoryExists = categories.find(category => category.id === data.categoryId);
        if (!categoryExists) {
            errors.push("Categoria selecionada inválida.");
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    validateCategory(data) {
        const errors = [];
        const MAX_NAME_LENGTH = 30;

        if (!data.name || data.name.length < 3) {
            errors.push("O nome da categoria deve ter pelo menos 3 caracteres.");
        }

        if (data.name > MAX_NAME_LENGTH) {
            errors.push(`O nome da categoria não pode ter mais de ${MAX_NAME_LENGTH} caracteres.`);
        }

        if (!data.iconId || !IconHelper.iconExists(data.iconId)) {
            errors.push("Ícone selecionado inválido.");
        }

        if (!data.type || !['income', 'outcome', 'both'].includes(data.type)) {
            errors.push("Tipo de categoria inválido.");
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        }
    }
};

/* Script para controle de exibição de transações */

const TransactionService = {
    _getRawTransactions() {
        return StorageService.get('transactions') || [];
    },

    getAllTransactions() {
        const transactions = this._getRawTransactions();
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getTransactionById(id) {
        const transactions = this._getRawTransactions();
        return transactions.find(t => t.id === id);
    },

    addTransaction(transactionData) {
        const transactionsArray = this._getRawTransactions();
        const newTransaction = ModelService.createTransaction(transactionData);

        transactionsArray.push(newTransaction);
        StorageService.save('transactions', transactionsArray);
    },

    updateTransaction(id, updatedData) {
        const transactions = this._getRawTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { id, ...updatedData };
            StorageService.save('transactions', transactions);
        }
    },

    deleteTransaction(id) {
        let transactions = this._getRawTransactions();
        transactions = transactions.filter(t => t.id !== id);
        StorageService.save('transactions', transactions);
    },

    getFilteredAndPaginated(dateFilter = {}, pagination = {}) {
        let list = this.getAllTransactions();
        const from = dateFilter.dateFrom || DateService.getFirstDayOfMonth();
        const to = dateFilter.dateTo || DateService.getToday();

        list = list.filter(t => t.date >= from && t.date <= to);

        const page = pagination.page || 1;
        const itemsPerPage = pagination.itemsPerPage || 10;
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        return {
            data: list.slice(start, end),
            totalItems: list.length,
            totalPages: Math.ceil(list.length / itemsPerPage)
        };
    }
};

const CategoryService = {
    _defaultCategoriesTemplate: [
        { name: "Alimentação", iconId: "hamburger", type: "outcome", isDefault: true },
        { name: "Contas", iconId: "receipt", type: "outcome", isDefault: true },
        { name: "Educação", iconId: "graduation_cap", type: "outcome", isDefault: true },
        { name: "Imposto", iconId: "scale", type: "outcome", isDefault: true },
        { name: "Investimentos", iconId: "investment", type: "income", isDefault: true },
        { name: "Lazer", iconId: "star", type: "outcome", isDefault: true },
        { name: "Moradia", iconId: "house", type: "outcome", isDefault: true },
        { name: "Outros", iconId: "default-icon", type: "both", isDefault: true },
        { name: "Salário", iconId: "dollar_sign", type: "income", isDefault: true },
        { name: "Saúde", iconId: "pill", type: "outcome", isDefault: true },
        { name: "Transporte", iconId: "car", type: "outcome", isDefault: true },
        { name: "Transporte", iconId: "car", type: "outcome", isDefault: false },
    ],

    _getRawCategories() {
        return StorageService.get('categories') || [];
    },

    initCategories() {
        const existingCategories = this._getRawCategories();

        if (existingCategories.length === 0) {
            const initialCategories = this._defaultCategoriesTemplate.map(cat =>
                ModelService.createCategory(cat)
            );
            StorageService.save('categories', initialCategories);
        }
    },

    getAllCategories() {
        return this._getRawCategories();
    },

    getCategoryById(id) {
        const categories = this._getRawCategories();
        return categories.find(c => c.id === id) || { name: "Outros", iconId: "default-icon" };
    },

    addCategory(categoryData) {
        const categories = this._getRawCategories();
        const newCategory = ModelService.createCategory(categoryData);

        categories.push(newCategory);
        StorageService.save('categories', categories);
    },

    updateCategory(id, updatedData) {
        const categories = this._getRawCategories();
        const index = categories.findIndex(category => category.id === id);
        if (index !== -1) {
            categories[index] = { id, ...updatedData };
            StorageService.save('categories', categories);
        }
    },
};

const DateService = {
    getFirstDayOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    },

    getToday() {
        return new Date().toLocaleDateString('en-CA');
    },

    getPreviousMonthRange() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
            from: start.toLocaleDateString('en-CA'),
            to: end.toLocaleDateString('en-CA')
        };
    },

};

const Renderer = {
    _createCategoryCard(category) {
        const icon = IconHelper.getIconById(category.iconId);

        let badgeClass = 'badge-both';
        let badgeText = 'Ambos';
        if (category.type === 'income') { badgeClass = 'badge-income'; badgeText = 'Entrada'; }
        if (category.type === 'outcome') { badgeClass = 'badge-outcome'; badgeText = 'Saída'; }

        const li = document.createElement('li');
        li.className = `category-card ${category.isDefault ? 'item-readonly' : ''}`;
        if (!category.isDefault) {
            li.dataset.id = category.id;
        }

        li.innerHTML = `
                <div class="category-main-info">
                    <div class="category-icon">${icon}</div>
                    <span class="category-name">${category.name}</span>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="category-actions">
                    ${!category.isDefault ? `
                        <button class="btn-action-edit" title="Editar categoria">
                            ${utilityIconMap.edit}
                        </button>
                        <button class="btn-action-delete" title="Excluir categoria">
                            ${utilityIconMap.delete}
                        </button>
                    ` : `
                        ${utilityIconMap.lock}
                    `}
                </div>
            `;

        return li;
    },



    renderTransactions(transactions, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (transactions.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'empty-state-card';
            emptyState.innerHTML = `
                <div class="empty-state-content">
                    ${utilityIconMap.empty_file}
                    <p>Não há transações registradas no período.</p>
                </div>
            `;
            container.appendChild(emptyState);
            return;
        }

        transactions.forEach(t => {
            const categoryData = CategoryService.getCategoryById(t.categoryId);
            const categoryIcon = IconHelper.getIconById(categoryData.iconId);

            const card = document.createElement('li');
            card.className = 'transaction-item';
            card.dataset.id = t.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            /* Colocar descrição do card para aria-label */
            card.setAttribute('aria-label', ``);

            const isNegative = t.amount < 0;

            const [year, month, day] = t.date.split('-');
            const dateFormatted = `${day}/${month}/${year}`;

            card.innerHTML = `
                <time class="transaction-date" datetime="${t.date}">${dateFormatted}</time>
                <div class="transaction-category-wrapper">
                    ${categoryIcon}
                    <span class="category-title">${categoryData.name}</span>
                </div>
                <span class="transaction-description">${t.description}</span>
                <span class="transaction-type ${isNegative ? 'is-negative' : 'is-positive'}">
                    ${isNegative ? 'Saída' : 'Entrada'}
                </span>
                <span class="transaction-amount ${isNegative ? 'is-negative' : 'is-positive'}">
                    ${isNegative ? '' : '+'}${Utils.formatCurrency(t.amount)}
                </span>
                <div class="transaction-action">
                    ${utilityIconMap.caret_right}
                </div>
            `;
            container.appendChild(card);
        });
    },

    renderCategoryOptions(selectContainerId, currentType) {
        const selectElem = document.getElementById(selectContainerId);
        if (!selectElem) return;

        selectElem.innerHTML = '<option value="" disabled selected hidden>Selecione</option>';

        if (!currentType) return;

        const categories = CategoryService.getAllCategories();

        const filteredCategories = categories.filter(category =>
            category.type === currentType || category.type === 'both'
        );

        filteredCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElem.appendChild(option);
        });
    },

    renderCategories() {
        const defaultContainer = document.querySelector('#section-default-categories .category-list');
        const userContainer = document.querySelector('#section-user-categories .category-list');

        defaultContainer.innerHTML = '';
        userContainer.innerHTML = '';

        const allCategories = CategoryService.getAllCategories();

        const defaultCategories = allCategories.filter(category => category.isDefault);
        const userCategories = allCategories.filter(category => !category.isDefault);

        defaultCategories.forEach(category => defaultContainer.appendChild(this._createCategoryCard(category)));

        if (userCategories.length === 0) {
            userContainer.innerHTML = `
            <li class="empty-state-card">
                <div class="empty-state-content">
                    ${utilityIconMap.empty_folder}
                    <p>Você ainda não criou nenhuma categoria personalizada.</p>
                </div>
            </li>
        `;
        } else {
            userCategories.forEach(category => userContainer.appendChild(this._createCategoryCard(category)));
        }

    },

    renderIconOptions(selectContainerId) {
        const selectElem = document.getElementById(selectContainerId);
        if (!selectElem) return;

        selectElem.innerHTML = '<option value="" disabled selected hidden>Selecione</option>';

        CATEGORY_ICON_LIBRARY.forEach(icon => {
            const option = document.createElement('option');
            option.value = icon.id;
            option.textContent = icon.name;
            selectElem.appendChild(option);
        });
    },
};

/* App initialization */

let abortController = new AbortController();
let selectedTransactionId = null;
let selectedCategoryId = null;
let currentPagination = {
    page: 1,
    itemsPerPage: SettingsService.getItemsPerPage() || 10
};
let dateFilters = {
    from: DateService.getFirstDayOfMonth(),
    to: DateService.getToday()
};

window.addEventListener('DOMContentLoaded', () => {
    const defaultViewId = 'dashboard-view';
    CategoryService.initCategories();
    showView(defaultViewId);
});

const CATEGORY_ICON_LIBRARY = [
    { id: "handshake", name: "Aperto de mão", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M254.3,107.91,228.78,56.85a16,16,0,0,0-21.47-7.15L182.44,62.13,130.05,48.27a8.14,8.14,0,0,0-4.1,0L73.56,62.13,48.69,49.7a16,16,0,0,0-21.47,7.15L1.7,107.9a16,16,0,0,0,7.15,21.47l27,13.51,55.49,39.63a8.06,8.06,0,0,0,2.71,1.25l64,16a8,8,0,0,0,7.6-2.1l55.07-55.08,26.42-13.21a16,16,0,0,0,7.15-21.46Zm-54.89,33.37L165,113.72a8,8,0,0,0-10.68.61C136.51,132.27,116.66,130,104,122L147.24,80h31.81l27.21,54.41ZM41.53,64,62,74.22,36.43,125.27,16,115.06Zm116,119.13L99.42,168.61l-49.2-35.14,28-56L128,64.28l9.8,2.59-45,43.68-.08.09a16,16,0,0,0,2.72,24.81c20.56,13.13,45.37,11,64.91-5L188,152.66Zm62-57.87-25.52-51L214.47,64,240,115.06Zm-87.75,92.67a8,8,0,0,1-7.75,6.06,8.13,8.13,0,0,1-1.95-.24L80.41,213.33a7.89,7.89,0,0,1-2.71-1.25L51.35,193.26a8,8,0,0,1,9.3-13l25.11,17.94L126,208.24A8,8,0,0,1,131.82,217.94Z"></path></svg>` },
    { id: "airplane", name: "Avião", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M235.58,128.84,160,91.06V48a32,32,0,0,0-64,0V91.06L20.42,128.84A8,8,0,0,0,16,136v32a8,8,0,0,0,9.57,7.84L96,161.76v18.93L82.34,194.34A8,8,0,0,0,80,200v32a8,8,0,0,0,11,7.43l37-14.81,37,14.81A8,8,0,0,0,176,232V200a8,8,0,0,0-2.34-5.66L160,180.69V161.76l70.43,14.08A8,8,0,0,0,240,168V136A8,8,0,0,0,235.58,128.84ZM224,158.24l-70.43-14.08A8,8,0,0,0,144,152v32a8,8,0,0,0,2.34,5.66L160,203.31v16.87l-29-11.61a8,8,0,0,0-5.94,0L96,220.18V203.31l13.66-13.65A8,8,0,0,0,112,184V152a8,8,0,0,0-9.57-7.84L32,158.24v-17.3l75.58-37.78A8,8,0,0,0,112,96V48a16,16,0,0,1,32,0V96a8,8,0,0,0,4.42,7.16L224,140.94Z"></path></svg>` },
    { id: "scale", name: "Balança", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"></path></svg>` },
    { id: "bank", name: "Banco", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"></path></svg>` },
    { id: "barbell", name: "Barra de peso", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z"></path></svg>` },
    { id: "baby", name: "Bêbe", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M92,140a12,12,0,1,1,12-12A12,12,0,0,1,92,140Zm72-24a12,12,0,1,0,12,12A12,12,0,0,0,164,116Zm-12.27,45.23a45,45,0,0,1-47.46,0,8,8,0,0,0-8.54,13.54,61,61,0,0,0,64.54,0,8,8,0,0,0-8.54-13.54ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88.11,88.11,0,0,0-84.09-87.91C120.32,56.38,120,71.88,120,72a8,8,0,0,0,16,0,8,8,0,0,1,16,0,24,24,0,0,1-48,0c0-.73.13-14.3,8.46-30.63A88,88,0,1,0,216,128Z"></path></svg>` },
    { id: "bike", name: "Bicicleta", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,112a47.81,47.81,0,0,0-16.93,3.09L165.93,72H192a8,8,0,0,1,8,8,8,8,0,0,0,16,0,24,24,0,0,0-24-24H152a8,8,0,0,0-6.91,12l11.65,20H99.26L82.91,60A8,8,0,0,0,76,56H48a8,8,0,0,0,0,16H71.41L85.12,95.51,69.41,117.06a48.13,48.13,0,1,0,12.92,9.44l11.59-15.9L125.09,164A8,8,0,1,0,138.91,156l-30.32-52h57.48l11.19,19.17A48,48,0,1,0,208,112ZM80,160a32,32,0,1,1-20.21-29.74l-18.25,25a8,8,0,1,0,12.92,9.42l18.25-25A31.88,31.88,0,0,1,80,160Zm128,32a32,32,0,0,1-22.51-54.72L201.09,164A8,8,0,1,0,214.91,156L199.3,129.21A32,32,0,1,1,208,192Z"></path></svg>` },
    { id: "cake", name: "Bolo", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M232,112a24,24,0,0,0-24-24H136V79a32.06,32.06,0,0,0,24-31c0-28-26.44-45.91-27.56-46.66a8,8,0,0,0-8.88,0C122.44,2.09,96,20,96,48a32.06,32.06,0,0,0,24,31v9H48a24,24,0,0,0-24,24v23.33a40.84,40.84,0,0,0,8,24.24V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V159.57a40.84,40.84,0,0,0,8-24.24ZM112,48c0-13.57,10-24.46,16-29.79,6,5.33,16,16.22,16,29.79a16,16,0,0,1-32,0ZM40,112a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v23.33c0,13.25-10.46,24.31-23.32,24.66A24,24,0,0,1,168,136a8,8,0,0,0-16,0,24,24,0,0,1-48,0,8,8,0,0,0-16,0,24,24,0,0,1-24.68,24C50.46,159.64,40,148.58,40,135.33Zm160,96H56a8,8,0,0,1-8-8V172.56A38.77,38.77,0,0,0,62.88,176a39.69,39.69,0,0,0,29-11.31A40.36,40.36,0,0,0,96,160a40,40,0,0,0,64,0,40.36,40.36,0,0,0,4.13,4.67A39.67,39.67,0,0,0,192,176c.38,0,.76,0,1.14,0A38.77,38.77,0,0,0,208,172.56V200A8,8,0,0,1,200,208Z"></path></svg>` },
    { id: "gas_pump", name: "Bomba de gasolina", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M241,69.66,221.66,50.34a8,8,0,0,0-11.32,11.32L229.66,81A8,8,0,0,1,232,86.63V168a8,8,0,0,1-16,0V128a24,24,0,0,0-24-24H176V56a24,24,0,0,0-24-24H72A24,24,0,0,0,48,56V208H32a8,8,0,0,0,0,16H192a8,8,0,0,0,0-16H176V120h16a8,8,0,0,1,8,8v40a24,24,0,0,0,48,0V86.63A23.85,23.85,0,0,0,241,69.66ZM64,208V56a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8V208Zm80-96a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h48A8,8,0,0,1,144,112Z"></path></svg>` },
    { id: "dog", name: "Cachorro", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M239.71,125l-16.42-88a16,16,0,0,0-19.61-12.58l-.31.09L150.85,40h-45.7L52.63,24.56l-.31-.09A16,16,0,0,0,32.71,37.05L16.29,125a15.77,15.77,0,0,0,9.12,17.52A16.26,16.26,0,0,0,32.12,144,15.48,15.48,0,0,0,40,141.84V184a40,40,0,0,0,40,40h96a40,40,0,0,0,40-40V141.85a15.5,15.5,0,0,0,7.87,2.16,16.31,16.31,0,0,0,6.72-1.47A15.77,15.77,0,0,0,239.71,125ZM32,128h0L48.43,40,90.5,52.37Zm144,80H136V195.31l13.66-13.65a8,8,0,0,0-11.32-11.32L128,180.69l-10.34-10.35a8,8,0,0,0-11.32,11.32L120,195.31V208H80a24,24,0,0,1-24-24V123.11L107.92,56h40.15L200,123.11V184A24,24,0,0,1,176,208Zm48-80L165.5,52.37,207.57,40,224,128ZM104,140a12,12,0,1,1-12-12A12,12,0,0,1,104,140Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,140Z"></path></svg>` },
    { id: "lock", name: "Cadeado", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"></path></svg>` },
    { id: "wheelchair", name: "Cadeira de rodas", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M255.59,189.47a8,8,0,0,0-10.12-5.06l-17.42,5.81-28.9-57.8A8,8,0,0,0,192,128H112V104h56a8,8,0,0,0,0-16H112V79a32,32,0,1,0-16,0V89.81A72,72,0,0,0,112,232c33.52,0,63.69-22.71,71.75-54a8,8,0,1,0-15.5-4C162.09,198,137.91,216,112,216A56,56,0,0,1,96,106.34V136a8,8,0,0,0,8,8h83.05l29.79,59.58a8,8,0,0,0,9.69,4l24-8A8,8,0,0,0,255.59,189.47ZM88,48a16,16,0,1,1,16,16A16,16,0,0,1,88,48Z"></path></svg>` },
    { id: "calendar", name: "Calendário", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-96-88v64a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm59.16,30.45L152,176h16a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136,23.76,23.76,0,0,1,171.16,150.45Z"></path></svg>` },
    { id: "coffee", name: "Café", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z"></path></svg>` },
    { id: "bed", name: "Cama", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216,72H32V48a8,8,0,0,0-16,0V208a8,8,0,0,0,16,0V176H240v32a8,8,0,0,0,16,0V112A40,40,0,0,0,216,72ZM32,88h72v72H32Zm88,72V88h96a24,24,0,0,1,24,24v48Z"></path></svg>` },
    { id: "shirt", name: "Camisa", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M247.59,61.22,195.83,33A8,8,0,0,0,192,32H160a8,8,0,0,0-8,8,24,24,0,0,1-48,0,8,8,0,0,0-8-8H64a8,8,0,0,0-3.84,1L8.41,61.22A15.76,15.76,0,0,0,1.82,82.48l19.27,36.81A16.37,16.37,0,0,0,35.67,128H56v80a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V128h20.34a16.37,16.37,0,0,0,14.58-8.71l19.27-36.81A15.76,15.76,0,0,0,247.59,61.22ZM35.67,112a.62.62,0,0,1-.41-.13L16.09,75.26,56,53.48V112ZM184,208H72V48h16.8a40,40,0,0,0,78.38,0H184Zm36.75-96.14a.55.55,0,0,1-.41.14H200V53.48l39.92,21.78Z"></path></svg>` },
    { id: "shopping_cart", name: "Carrinho de compras", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z"></path></svg>` },
    { id: "car", name: "Carro", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M240,104H229.2L201.42,41.5A16,16,0,0,0,186.8,32H69.2a16,16,0,0,0-14.62,9.5L26.8,104H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V184h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V120h8a8,8,0,0,0,0-16ZM69.2,48H186.8l24.89,56H44.31ZM64,200H40V184H64Zm128,0V184h24v16Zm24-32H40V120H216ZM56,144a8,8,0,0,1,8-8H80a8,8,0,0,1,0,16H64A8,8,0,0,1,56,144Zm112,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H176A8,8,0,0,1,168,144Z"></path></svg>` },
    { id: "credit_card", name: "Cartão de crédito", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z"></path></svg>` },
    { id: "house", name: "Casa", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"></path></svg>` },
    { id: "champagne", name: "Champagne", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M184,20a12,12,0,1,1,12,12A12,12,0,0,1,184,20ZM164.12,73.23c7.26,44.25,4.35,75.76-8.66,93.66A39.94,39.94,0,0,1,128,183.42V232h16a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16h16V183.42a40,40,0,0,1-27.46-16.53c-13-17.9-15.91-49.41-8.65-93.66A451,451,0,0,1,90.1,13.53,8,8,0,0,1,97.71,8H142.3a8,8,0,0,1,7.61,5.53A451,451,0,0,1,164.12,73.23ZM93.8,64h52.4c-3-15.58-6.72-29.81-9.78-40H103.59C100.53,34.19,96.83,48.42,93.8,64ZM149,80H91c-4.49,30-5.14,61.54,6.45,77.49C102.63,164.56,110,168,120,168s17.38-3.44,22.52-10.51C154.1,141.54,153.46,110,149,80Zm71-40a12,12,0,1,0,12,12A12,12,0,0,0,220,40ZM196,88a12,12,0,1,0,12,12A12,12,0,0,0,196,88Z"></path></svg>` },
    { id: "graduation_cap", name: "Chapéu de graduação", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130,130,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.63,115.63,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12ZM128,200c-43.27,0-68.72-21.14-80-33.71V126.4l76.24,40.66a8,8,0,0,0,7.52,0L176,143.47v46.34C163.4,195.69,147.52,200,128,200Zm80-33.75a97.83,97.83,0,0,1-16,14.25V134.93l16-8.53ZM188,118.94l-.22-.13-56-29.87a8,8,0,0,0-7.52,14.12L171,128l-43,22.93L25,96,128,41.07,231,96Z"></path></svg>` },
    { id: "dollar_sign", name: "Cifrão", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M152,120H136V56h8a32,32,0,0,1,32,32,8,8,0,0,0,16,0,48.05,48.05,0,0,0-48-48h-8V24a8,8,0,0,0-16,0V40h-8a48,48,0,0,0,0,96h8v64H104a32,32,0,0,1-32-32,8,8,0,0,0-16,0,48.05,48.05,0,0,0,48,48h16v16a8,8,0,0,0,16,0V216h16a48,48,0,0,0,0-96Zm-40,0a32,32,0,0,1,0-64h8v64Zm40,80H136V136h16a32,32,0,0,1,0,64Z"></path></svg>` },
    { id: "paperclip", name: "Clipe de papel", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z"></path></svg>` },
    { id: "piggy_bank", name: "Cofrinho", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M192,116a12,12,0,1,1-12-12A12,12,0,0,1,192,116ZM152,64H112a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm96,48v32a24,24,0,0,1-24,24h-2.36l-16.21,45.38A16,16,0,0,1,190.36,224H177.64a16,16,0,0,1-15.07-10.62L160.65,208h-57.3l-1.92,5.38A16,16,0,0,1,86.36,224H73.64a16,16,0,0,1-15.07-10.62L46,178.22a87.69,87.69,0,0,1-21.44-48.38A16,16,0,0,0,16,144a8,8,0,0,1-16,0,32,32,0,0,1,24.28-31A88.12,88.12,0,0,1,112,32H216a8,8,0,0,1,0,16H194.61a87.93,87.93,0,0,1,30.17,37c.43,1,.85,2,1.25,3A24,24,0,0,1,248,112Zm-16,0a8,8,0,0,0-8-8h-3.66a8,8,0,0,1-7.64-5.6A71.9,71.9,0,0,0,144,48H112A72,72,0,0,0,58.91,168.64a8,8,0,0,1,1.64,2.71L73.64,208H86.36l3.82-10.69A8,8,0,0,1,97.71,192h68.58a8,8,0,0,1,7.53,5.31L177.64,208h12.72l18.11-50.69A8,8,0,0,1,216,152h8a8,8,0,0,0,8-8Z"></path></svg>` },
    { id: "computer", name: "Computador", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216,72a8,8,0,0,1-8,8H176a8,8,0,0,1,0-16h32A8,8,0,0,1,216,72Zm-8,24H176a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm40-48V208a16,16,0,0,1-16,16H152a16,16,0,0,1-16-16V192H96v16h16a8,8,0,0,1,0,16H64a8,8,0,0,1,0-16H80V192H32A24,24,0,0,1,8,168V96A24,24,0,0,1,32,72H136V48a16,16,0,0,1,16-16h80A16,16,0,0,1,248,48ZM136,176V88H32a8,8,0,0,0-8,8v72a8,8,0,0,0,8,8Zm96,32V48H152V208h80Zm-40-40a12,12,0,1,0,12,12A12,12,0,0,0,192,168Z"></path></svg>` },
    { id: "traffic_cone", name: "Cone de trânsito", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M232,208H213.69L153.42,34.75A16,16,0,0,0,138.31,24H117.69a16,16,0,0,0-15.11,10.74L42.31,208H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM95.43,104h65.14l16.7,48H78.73Zm22.26-64h20.62L155,88H101ZM73.17,168H182.83l13.92,40H59.25Z"></path></svg>` },
    { id: "heart", name: "Coracao", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"></path></svg>` },
    { id: "electricity", name: "Eletricidade", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path></svg>` },
    { id: "envelope", name: "Envelope", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"></path></svg>` },
    { id: "star", name: "Estrela", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z"></path></svg>` },
    { id: "rocket", name: "Foguete", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M223.85,47.12a16,16,0,0,0-15-15c-12.58-.75-44.73.4-71.41,27.07L132.69,64H74.36A15.91,15.91,0,0,0,63,68.68L28.7,103a16,16,0,0,0,9.07,27.16l38.47,5.37,44.21,44.21,5.37,38.49a15.94,15.94,0,0,0,10.78,12.92,16.11,16.11,0,0,0,5.1.83A15.91,15.91,0,0,0,153,227.3L187.32,193A15.91,15.91,0,0,0,192,181.64V123.31l4.77-4.77C223.45,91.86,224.6,59.71,223.85,47.12ZM74.36,80h42.33L77.16,119.52,40,114.34Zm74.41-9.45a76.65,76.65,0,0,1,59.11-22.47,76.46,76.46,0,0,1-22.42,59.16L128,164.68,91.32,128ZM176,181.64,141.67,216l-5.19-37.17L176,139.31Zm-74.16,9.5C97.34,201,82.29,224,40,224a8,8,0,0,1-8-8c0-42.29,23-57.34,32.86-61.85a8,8,0,0,1,6.64,14.56c-6.43,2.93-20.62,12.36-23.12,38.91,26.55-2.5,36-16.69,38.91-23.12a8,8,0,1,1,14.56,6.64Z"></path></svg>` },
    { id: "shapes", name: "Formas geométricas", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M71.59,61.47a8,8,0,0,0-15.18,0l-40,120A8,8,0,0,0,24,192h80a8,8,0,0,0,7.59-10.53ZM35.1,176,64,89.3,92.9,176ZM208,76a52,52,0,1,0-52,52A52.06,52.06,0,0,0,208,76Zm-88,0a36,36,0,1,1,36,36A36,36,0,0,1,120,76Zm104,68H136a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V152A8,8,0,0,0,224,144Zm-8,56H144V160h72Z"></path></svg>` },
    { id: "fork_knife", name: "Garfo e faca", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M72,88V40a8,8,0,0,1,16,0V88a8,8,0,0,1-16,0ZM216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40ZM200,53.9c-32.17,24.57-38.47,84.42-39.7,106.1H200ZM119.89,38.69a8,8,0,1,0-15.78,2.63L112,88.63a32,32,0,0,1-64,0l7.88-47.31a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"></path></svg>` },
    { id: "bottle", name: "Garrafa", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M245.66,42.34l-32-32a8,8,0,0,0-11.32,11.32l1.48,1.47L148.65,64.51l-38.22,7.65a8.05,8.05,0,0,0-4.09,2.18L23,157.66a24,24,0,0,0,0,33.94L64.4,233a24,24,0,0,0,33.94,0l83.32-83.31a8,8,0,0,0,2.18-4.09l7.65-38.22,41.38-55.17,1.47,1.48a8,8,0,0,0,11.32-11.32ZM96,107.31,148.69,160,104,204.69,51.31,152ZM81.37,224a7.94,7.94,0,0,1-5.65-2.34L34.34,180.28a8,8,0,0,1,0-11.31L40,163.31,92.69,216,87,221.66A8,8,0,0,1,81.37,224ZM177.6,99.2a7.92,7.92,0,0,0-1.44,3.23l-7.53,37.63L160,148.69,107.31,96l8.63-8.63,37.63-7.53a7.92,7.92,0,0,0,3.23-1.44l58.45-43.84,6.19,6.19Z"></path></svg>` },
    { id: "drop", name: "Gota", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z"></path></svg>` },
    { id: "hamburger", name: "Hamburguer", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M48.07,104H207.93a16,16,0,0,0,15.72-19.38C216.22,49.5,176,24,128,24S39.78,49.5,32.35,84.62A16,16,0,0,0,48.07,104ZM128,40c39.82,0,74.21,20.61,79.93,48H48.07L48,87.93C53.79,60.61,88.18,40,128,40ZM229.26,152.48l-41.13,15L151,152.57a8,8,0,0,0-5.94,0l-37,14.81L71,152.57a8,8,0,0,0-5.7-.09l-44,16a8,8,0,0,0,5.47,15L40,178.69V184a40,40,0,0,0,40,40h96a40,40,0,0,0,40-40v-9.67l18.73-6.81a8,8,0,1,0-5.47-15ZM200,184a24,24,0,0,1-24,24H80a24,24,0,0,1-24-24V172.88l11.87-4.32L105,183.43a8,8,0,0,0,5.94,0l37-14.81,37,14.81a8,8,0,0,0,5.7.09l9.27-3.37ZM16,128a8,8,0,0,1,8-8H232a8,8,0,0,1,0,16H24A8,8,0,0,1,16,128Z"></path></svg>` },
    { id: "hospital", name: "Hospital", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M248,208h-8V128a16,16,0,0,0-16-16H168V48a16,16,0,0,0-16-16H56A16,16,0,0,0,40,48V208H32a8,8,0,0,0,0,16H248a8,8,0,0,0,0-16Zm-24-80v80H168V128ZM56,48h96V208H136V160a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v48H56Zm64,160H88V168h32ZM72,96a8,8,0,0,1,8-8H96V72a8,8,0,0,1,16,0V88h16a8,8,0,0,1,0,16H112v16a8,8,0,0,1-16,0V104H80A8,8,0,0,1,72,96Z"></path></svg>` },
    { id: "church", name: "Igreja", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M228.12,145.14,192,123.47V104a8,8,0,0,0-4-7L136,67.36V48h16a8,8,0,0,0,0-16H136V16a8,8,0,0,0-16,0V32H104a8,8,0,0,0,0,16h16V67.36L68,97.05a8,8,0,0,0-4,7v19.47L27.88,145.14A8,8,0,0,0,24,152v64a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V168a8,8,0,0,1,16,0v48a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V152A8,8,0,0,0,228.12,145.14ZM40,156.53l24-14.4V208H40ZM128,144a24,24,0,0,0-24,24v40H80V108.64l48-27.43,48,27.43V208H152V168A24,24,0,0,0,128,144Zm88,64H192V142.13l24,14.4Z"></path></svg>` },
    { id: "insect", name: "Inseto", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M144,92a12,12,0,1,1,12,12A12,12,0,0,1,144,92ZM100,80a12,12,0,1,0,12,12A12,12,0,0,0,100,80Zm116,64A87.76,87.76,0,0,1,213,167l22.24,9.72A8,8,0,0,1,232,192a7.89,7.89,0,0,1-3.2-.67L207.38,182a88,88,0,0,1-158.76,0L27.2,191.33A7.89,7.89,0,0,1,24,192a8,8,0,0,1-3.2-15.33L43,167A87.76,87.76,0,0,1,40,144v-8H16a8,8,0,0,1,0-16H40v-8a87.76,87.76,0,0,1,3-23L20.8,79.33a8,8,0,1,1,6.4-14.66L48.62,74a88,88,0,0,1,158.76,0l21.42-9.36a8,8,0,0,1,6.4,14.66L213,89.05a87.76,87.76,0,0,1,3,23v8h24a8,8,0,0,1,0,16H216ZM56,120H200v-8a72,72,0,0,0-144,0Zm64,95.54V136H56v8A72.08,72.08,0,0,0,120,215.54ZM200,144v-8H136v79.54A72.08,72.08,0,0,0,200,144Z"></path></svg>` },
    { id: "internet", name: "Internet", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"></path></svg>` },
    { id: "investment", name: "investimento", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z"></path></svg>` },
    { id: "book", name: "Livro", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,160H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z"></path></svg>` },
    { id: "hammer", name: "Martelo", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M251.34,112,183.88,44.08a96.1,96.1,0,0,0-135.77,0l-.09.09L34.25,58.4A8,8,0,0,0,45.74,69.53L59.47,55.35a79.92,79.92,0,0,1,18.71-13.9L124.68,88l-96,96a16,16,0,0,0,0,22.63l20.69,20.69a16,16,0,0,0,22.63,0l96-96,14.34,14.34h0L200,163.3a16,16,0,0,0,22.63,0l28.69-28.69A16,16,0,0,0,251.34,112ZM60.68,216,40,195.31l68-68L128.68,148ZM162.34,114.32,140,136.67,119.31,116l22.35-22.35a8,8,0,0,0,0-11.32L94.32,35a80,80,0,0,1,78.23,20.41l44.22,44.51L188,128.66l-14.34-14.34A8,8,0,0,0,162.34,114.32Zm49,37.66-12-12L228,111.25l12,12Z"></path></svg>` },
    { id: "gavel", name: "Martelo de juiz", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M243.32,116.69l-16-16a16,16,0,0,0-20.84-1.53L156.84,49.52a16,16,0,0,0-1.52-20.84l-16-16a16,16,0,0,0-22.63,0l-64,64a16,16,0,0,0,0,22.63l16,16a16,16,0,0,0,20.83,1.52L96.69,124,31.31,189.38A25,25,0,0,0,66.63,224.7L132,159.32l7.17,7.16a16,16,0,0,0,1.52,20.84l16,16a16,16,0,0,0,22.63,0l64-64A16,16,0,0,0,243.32,116.69ZM80,104,64,88l64-64,16,16ZM55.32,213.38a9,9,0,0,1-12.69,0,9,9,0,0,1,0-12.68L108,135.32,120.69,148ZM101,105.66,145.66,61,195,110.34,150.35,155ZM168,192l-16-16,4-4h0l56-56h0l4-4,16,16Z"></path></svg>` },
    { id: "coins", name: "Moedas", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57ZM232,132c0,13.22-30.79,28-72,28-3.73,0-7.43-.13-11.08-.37C170.49,151.77,184,139,184,124V105.74C213.87,110.19,232,122.27,232,132ZM72,150.25V126.46A183.74,183.74,0,0,0,96,128a183.74,183.74,0,0,0,24-1.54v23.79A163,163,0,0,1,96,152,163,163,0,0,1,72,150.25Zm96-40.32V124c0,8.39-12.41,17.4-32,22.87V123.5C148.91,120.37,159.84,115.71,168,109.93ZM96,56c41.21,0,72,14.78,72,28s-30.79,28-72,28S24,97.22,24,84,54.79,56,96,56ZM24,124V109.93c8.16,5.78,19.09,10.44,32,13.57v23.37C36.41,141.4,24,132.39,24,124Zm64,48v-4.17c2.63.1,5.29.17,8,.17,3.88,0,7.67-.13,11.39-.35A121.92,121.92,0,0,0,120,171.41v23.46C100.41,189.4,88,180.39,88,172Zm48,26.25V174.4a179.48,179.48,0,0,0,24,1.6,183.74,183.74,0,0,0,24-1.54v23.79a165.45,165.45,0,0,1-48,0Zm64-3.38V171.5c12.91-3.13,23.84-7.79,32-13.57V172C232,180.39,219.59,189.4,200,194.87Z"></path></svg>` },
    { id: "bus", name: "Ônibus", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M184,32H72A32,32,0,0,0,40,64V208a16,16,0,0,0,16,16H80a16,16,0,0,0,16-16V192h64v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V64A32,32,0,0,0,184,32ZM56,176V120H200v56Zm0-96H200v24H56ZM72,48H184a16,16,0,0,1,16,16H56A16,16,0,0,1,72,48Zm8,160H56V192H80Zm96,0V192h24v16Zm-72-60a12,12,0,1,1-12-12A12,12,0,0,1,104,148Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,148Zm72-68v24a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0ZM24,80v24a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0Z"></path></svg>` },
    { id: "package", name: "Pacote", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"></path></svg>` },
    { id: "bread", name: "Pão", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M240,80a40,40,0,0,0-40-40H48a40,40,0,0,0-16,76.65V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V116.65A40.06,40.06,0,0,0,240,80ZM48,120a8,8,0,0,0,0-16,24,24,0,0,1,0-48h96a24,24,0,0,1,0,48,8,8,0,0,0,0,16v80H48Zm152-16a8,8,0,0,0,0,16v80H160V116.65A40,40,0,0,0,176,56h24a24,24,0,0,1,0,48Z"></path></svg>` },
    { id: "pill", name: "Pílula", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z"></path></svg>` },
    { id: "building", name: "Prédio", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,32H192V224H160V184a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v40H64Zm80,192H112V192h32ZM88,64a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,64Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,64ZM88,104a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,104Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,104ZM88,144a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,144Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,144Z"></path></svg>` },
    { id: "receipt", name: "Recibo", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z"></path></svg>` },
    { id: "telephone", name: "Telefone", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"></path></svg>` },
    { id: "tent", name: "Tenda", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M255.31,188.75l-64-144A8,8,0,0,0,184,40H72a8,8,0,0,0-7.27,4.69.21.21,0,0,0,0,.06l0,.12,0,0L.69,188.75A8,8,0,0,0,8,200H248a8,8,0,0,0,7.31-11.25ZM64,184H20.31L64,85.7Zm16,0V85.7L123.69,184Zm61.2,0L84.31,56H178.8l56.89,128Z"></path></svg>` },
    { id: "broom", name: "Vassoura", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M235.5,216.81c-22.56-11-35.5-34.58-35.5-64.8V134.73a15.94,15.94,0,0,0-10.09-14.87L165,110a8,8,0,0,1-4.48-10.34l21.32-53a28,28,0,0,0-16.1-37,28.14,28.14,0,0,0-35.82,16,.61.61,0,0,0,0,.12L108.9,79a8,8,0,0,1-10.37,4.49L73.11,73.14A15.89,15.89,0,0,0,55.74,76.8C34.68,98.45,24,123.75,24,152a111.45,111.45,0,0,0,31.18,77.53A8,8,0,0,0,61,232H232a8,8,0,0,0,3.5-15.19ZM67.14,88l25.41,10.3a24,24,0,0,0,31.23-13.45l21-53c2.56-6.11,9.47-9.27,15.43-7a12,12,0,0,1,6.88,15.92L145.69,93.76a24,24,0,0,0,13.43,31.14L184,134.73V152c0,.33,0,.66,0,1L55.77,101.71A108.84,108.84,0,0,1,67.14,88Zm48,128a87.53,87.53,0,0,1-24.34-42,8,8,0,0,0-15.49,4,105.16,105.16,0,0,0,18.36,38H64.44A95.54,95.54,0,0,1,40,152a85.9,85.9,0,0,1,7.73-36.29l137.8,55.12c3,18,10.56,33.48,21.89,45.16Z"></path></svg>` },
    { id: "joystick", name: "Joystick", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z"></path></svg>` },
    { id: "guitar", name: "Violão", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M249.66,46.34l-40-40a8,8,0,0,0-11.31,11.32L200.69,20,140.52,80.16C117.73,68.3,92.21,69.29,76.75,84.74a42.27,42.27,0,0,0-9.39,14.37A8.24,8.24,0,0,1,59.81,104c-14.59.49-27.26,5.72-36.65,15.11C11.08,131.22,6,148.6,8.74,168.07,11.4,186.7,21.07,205.15,36,220s33.34,24.56,52,27.22A71.13,71.13,0,0,0,98.1,248c15.32,0,28.83-5.23,38.76-15.16,9.39-9.39,14.62-22.06,15.11-36.65a8.24,8.24,0,0,1,4.92-7.55,42.12,42.12,0,0,0,14.37-9.39c15.45-15.46,16.44-41,4.58-63.77L236,55.31l2.34,2.34a8,8,0,1,0,11.32-11.31ZM160,167.93a26.12,26.12,0,0,1-8.95,5.83,24.24,24.24,0,0,0-15,21.89c-.36,10.46-4,19.41-10.43,25.88-8.44,8.43-21,11.95-35.36,9.89C75,229.25,59.73,221.19,47.27,208.73S26.75,181,24.58,165.81c-2-14.37,1.46-26.92,9.89-35.36C40.94,124,49.89,120.37,60.35,120h0a24.22,24.22,0,0,0,21.89-15,26.12,26.12,0,0,1,5.83-9c5.49-5.49,13-8.13,21.38-8.13a49.38,49.38,0,0,1,19.13,4.19L108.5,112.19a32,32,0,1,0,35.31,35.31l20.08-20.08C170.41,142.71,169.47,158.41,160,167.93Zm-10.4-61.48a72.9,72.9,0,0,1,5.93,6.75l-15.42,15.42a32.22,32.22,0,0,0-12.68-12.68l15.42-15.43A73,73,0,0,1,149.55,106.45ZM112,128a16,16,0,0,1,16,16h0a16,16,0,1,1-16-16Zm48.85-32.85a86.94,86.94,0,0,0-6.68-6L176,67.31,188.69,80l-21.83,21.82A86.94,86.94,0,0,0,160.86,95.14ZM200,68.68,187.32,56,212,31.31,224.69,44ZM93.66,194.33a8,8,0,0,1-11.31,11.32l-32-32a8,8,0,0,1,11.32-11.31Z"></path></svg>` },
    { id: "wifi", name: "Wifi", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0,8,8,0,0,0,11.24-1.3A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z"></path></svg>` },
    { id: "default-icon", name: "Ícone padrão", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M71.59,61.47a8,8,0,0,0-15.18,0l-40,120A8,8,0,0,0,24,192h80a8,8,0,0,0,7.59-10.53ZM35.1,176,64,89.3,92.9,176ZM208,76a52,52,0,1,0-52,52A52.06,52.06,0,0,0,208,76Zm-88,0a36,36,0,1,1,36,36A36,36,0,0,1,120,76Zm104,68H136a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V152A8,8,0,0,0,224,144Zm-8,56H144V160h72Z"></path></svg>` },
];

const utilityIconMap = {
    arrow_down: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"> <path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"> </path> </svg>`,
    arrow_up: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"> <path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"> </path> </svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"> <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z"> </path> </svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"> <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"> </path> </svg>`,
    lock: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"> <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"> </path> </svg>`,
    empty_file: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M80,224a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V184a8,8,0,0,1,16,0v32H72A8,8,0,0,1,80,224ZM216,88v48a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H120a8,8,0,0,1,0-16h32a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88Zm-56-8h28.69L160,51.31ZM80,24H56A16,16,0,0,0,40,40V64a8,8,0,0,0,16,0V40H80a8,8,0,0,0,0-16ZM208,168a8,8,0,0,0-8,8v40h-8a8,8,0,0,0,0,16h8a16,16,0,0,0,16-16V176A8,8,0,0,0,208,168ZM48,152a8,8,0,0,0,8-8V104a8,8,0,0,0-16,0v40A8,8,0,0,0,48,152Zm104,64H112a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Z"></path></svg>`,
    empty_folder: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M24,80V64A16,16,0,0,1,40,48H93.33a16.12,16.12,0,0,1,9.6,3.2L132.8,73.6a8,8,0,1,1-9.6,12.8L93.33,64H40V80a8,8,0,0,1-16,0ZM88,200H40v-8a8,8,0,0,0-16,0v8.62A15.4,15.4,0,0,0,39.38,216H88a8,8,0,0,0,0-16Zm72,0H128a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm64-56a8,8,0,0,0-8,8v48H200a8,8,0,0,0,0,16h16.89A15.13,15.13,0,0,0,232,200.89V152A8,8,0,0,0,224,144Zm-8-72H168a8,8,0,0,0,0,16h48v24a8,8,0,0,0,16,0V88A16,16,0,0,0,216,72ZM32,160a8,8,0,0,0,8-8V120a8,8,0,0,0-16,0v32A8,8,0,0,0,32,160Z"></path></svg>`,
    caret_right: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>`,
};

/* Script para controle das views */

const views = document.querySelectorAll('.app-view');
const navLinks = document.querySelectorAll('.nav-link, .menu-btn, .logo-link, .btn-redirect');

function showView(viewId) {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateStickyButtonsVisibility();
    updateNavLinksActiveState(viewId);
    updateViewContent(viewId);
    closeModalMenu();
    closeTransactionModal();
    closeCategoryModal();
    closeTransactionDetailsModal();
    closeExportMenu();
    closeConfirmModal();
}

function updateNavLinksActiveState(viewId) {
    navLinks.forEach(link => {
        link.classList.toggle('is-active', link.dataset.view === viewId);
    });
}

function updateViewContent(viewId) {
    if (viewId === 'dashboard-view') {
        const data = TransactionService.getFilteredAndPaginated({}, { page: 1, itemsPerPage: 10 });
        Renderer.renderTransactions(data.data, 'dashboard-transaction-list');

        const titleElement = document.getElementById('history-title');
        const infoTag = document.getElementById('history-info-tag');
        const currentMonth = Utils.formatMonthYear(DateService.getFirstDayOfMonth());

        const formattedTitle = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
        titleElement.textContent = `Histórico - ${formattedTitle}`;
        infoTag.textContent = `Exibindo as 10 últimas transações do mês de ${formattedTitle}`;

        updateDashboardSummary();
    }
    else if (viewId === 'statements-view') {
        document.getElementById('date-from').value = dateFilters.from;
        document.getElementById('date-to').value = dateFilters.to;
        const data = TransactionService.getFilteredAndPaginated(
            { dateFrom: dateFilters.from, dateTo: dateFilters.to },
            currentPagination
        );
        Renderer.renderTransactions(data.data, 'statements-transaction-list');
        updatePaginationInfo(data);
        updatePaginationSelect();
        updatePaginationButtons(data);
        updateStatementsSummary();
    } else if (viewId === 'categories-view') {
        Renderer.renderCategories();
    }
}

function updateDashboardSummary() {
    const now = new Date();
    const currentMonthFrom = DateService.getFirstDayOfMonth();
    const currentMonthTo = DateService.getToday();
    const prevMonthRange = DateService.getPreviousMonthRange();

    const allTransactions = TransactionService.getAllTransactions();

    const currentMonthList = allTransactions.filter(t => t.date >= currentMonthFrom && t.date <= currentMonthTo);
    const prevMonthList = allTransactions.filter(t => t.date >= prevMonthRange.from && t.date <= prevMonthRange.to);

    const currentIncome = currentMonthList.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const currentOutcome = currentMonthList.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const prevIncome = prevMonthList.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const prevOutcome = prevMonthList.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = currentIncome + currentOutcome;
    const prevTotalBalance = prevIncome + prevOutcome;

    const incomeValueElem = document.querySelector('.card-incomes .value');
    const outcomeValueElem = document.querySelector('.card-outcomes .value');
    const balanceValueElem = document.querySelector('.card-balance .value');
    const balanceCard = document.querySelector('.card-balance');

    const incomeBadge = document.querySelector('.card-incomes .percentage-tag');
    const outcomeBadge = document.querySelector('.card-outcomes .percentage-tag');
    const balanceBadge = document.querySelector('.card-balance .percentage-tag');

    if (incomeValueElem) incomeValueElem.textContent = `+${Utils.formatCurrency(currentIncome)}`;
    if (outcomeValueElem) outcomeValueElem.textContent = `-${Utils.formatCurrency(Math.abs(currentOutcome))}`;
    if (balanceValueElem) balanceValueElem.textContent = Utils.formatCurrency(totalBalance);
    if (balanceCard) balanceCard.classList.toggle('is-negative', totalBalance < 0);

    if (incomeBadge) {
        if (prevMonthList.length === 0) {
            incomeBadge.innerHTML = '-';
            incomeBadge.className = 'percentage-tag is-neutral';
        } else if (prevIncome === 0) {
            if (currentIncome > prevIncome) {
                incomeBadge.innerHTML = `${utilityIconMap.arrow_up} Alta`;
                incomeBadge.className = 'percentage-tag is-positive';
            } else if (currentIncome < prevIncome) {
                incomeBadge.innerHTML = `${utilityIconMap.arrow_down} Queda`;
                incomeBadge.className = 'percentage-tag is-negative';
            } else {
                incomeBadge.innerHTML = `= Zero`;
                incomeBadge.className = 'percentage-tag is-neutral';
            }
        } else {
            const diff = currentIncome - prevIncome;
            const percent = (diff / prevIncome) * 100;

            if (currentIncome > prevIncome) {
                incomeBadge.innerHTML = `${utilityIconMap.arrow_up} ${Math.abs(percent).toFixed(1)}%`;
                incomeBadge.className = 'percentage-tag is-positive';
            } else if (currentIncome < prevIncome) {
                incomeBadge.innerHTML = `${utilityIconMap.arrow_down} ${Math.abs(percent).toFixed(1)}%`;
                incomeBadge.className = 'percentage-tag is-negative';
            } else {
                incomeBadge.innerHTML = `=`;
                incomeBadge.className = 'percentage-tag is-neutral';
            }
        }
    }

    if (outcomeBadge) {
        if (prevMonthList.length === 0) {
            outcomeBadge.innerHTML = '-';
            outcomeBadge.className = 'percentage-tag is-neutral';
        } else if (prevOutcome === 0) {
            if (currentOutcome < prevOutcome) {
                outcomeBadge.innerHTML = `${utilityIconMap.arrow_up} Alta`;
                outcomeBadge.className = 'percentage-tag is-negative';
            } else if (currentOutcome > prevOutcome) {
                outcomeBadge.innerHTML = `${utilityIconMap.arrow_down} Queda`;
                outcomeBadge.className = 'percentage-tag is-positive';
            } else {
                outcomeBadge.innerHTML = `= Zero`;
                outcomeBadge.className = 'percentage-tag is-neutral';
            }
        } else {
            const diff = currentOutcome - prevOutcome;
            const percent = (diff / prevOutcome) * 100;

            if (currentOutcome < prevOutcome) {
                outcomeBadge.innerHTML = `${utilityIconMap.arrow_up} ${Math.abs(percent).toFixed(1)}%`;
                outcomeBadge.className = 'percentage-tag is-negative';
            } else if (currentOutcome > prevOutcome) {
                outcomeBadge.innerHTML = `${utilityIconMap.arrow_down} ${Math.abs(percent).toFixed(1)}%`;
                outcomeBadge.className = 'percentage-tag is-positive';
            } else {
                outcomeBadge.innerHTML = `=`;
                outcomeBadge.className = 'percentage-tag is-neutral';
            }
        }
    }

    if (balanceBadge) {
        if (prevMonthList.length === 0) {
            balanceBadge.innerHTML = '-';
            balanceBadge.className = 'percentage-tag is-neutral';
        } else if (prevTotalBalance === 0) {
            if (totalBalance > 0) {
                balanceBadge.innerHTML = `${utilityIconMap.arrow_up} Alta`;
                balanceBadge.className = 'percentage-tag is-positive';
            } else if (totalBalance < 0) {
                balanceBadge.innerHTML = `${utilityIconMap.arrow_down} Queda`;
                balanceBadge.className = 'percentage-tag is-negative';
            } else {
                balanceBadge.innerHTML = `= Zero`;
                balanceBadge.className = 'percentage-tag is-neutral';
            }
        } else {
            const diff = totalBalance - prevTotalBalance;
            const percent = (diff / prevTotalBalance) * 100;

            if (totalBalance > prevTotalBalance) {
                balanceBadge.innerHTML = `${utilityIconMap.arrow_up} ${Math.abs(percent).toFixed(1)}%`;
                balanceBadge.className = 'percentage-tag is-positive';
            } else if (totalBalance < prevTotalBalance) {
                balanceBadge.innerHTML = `${utilityIconMap.arrow_down} ${Math.abs(percent).toFixed(1)}%`;
                balanceBadge.className = 'percentage-tag is-negative';
            } else {
                balanceBadge.innerHTML = `=`;
                balanceBadge.className = 'percentage-tag is-neutral';
            }
        }
    }
}

function updateStatementsSummary() {
    const from = dateFilters.from;
    const to = dateFilters.to;

    const filteredTransactions = TransactionService.getAllTransactions().filter(
        t => t.date >= from && t.date <= to
    );

    const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const totalOutcome = filteredTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalIncome + totalOutcome;
    const totalTransactions = filteredTransactions.length;

    const incomeValueElem = document.querySelector('.income-summary-stat .stat-value');
    const outcomeValueElem = document.querySelector('.outcome-summary-stat .stat-value');
    const balanceValueElem = document.querySelector('.balance-summary-stat .stat-value');
    const countValueElem = document.querySelector('.transactions-summary-stat .stat-value');

    const balanceStatContainer = document.querySelector('.balance-summary-stat');
    if (balanceStatContainer) {
        balanceStatContainer.classList.toggle('is-negative', totalBalance < 0);
    }

    if (incomeValueElem) incomeValueElem.textContent = `+${Utils.formatCurrency(totalIncome)}`;
    if (outcomeValueElem) outcomeValueElem.textContent = `-${Utils.formatCurrency(Math.abs(totalOutcome))}`;
    if (balanceValueElem) balanceValueElem.textContent = Utils.formatCurrency(totalBalance);
    if (countValueElem) countValueElem.textContent = totalTransactions;
}

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const viewId = link.dataset.view;
        showView(viewId);
    });
});

/* Script para controle de visibilidade do menu modal */

const btnMenuToggle = document.querySelector('.btn-menu-toggle');
const btnCloseMenu = document.getElementById('btn-close-menu');
const modalMenu = document.getElementById('modal-menu');

function toggleModalMenu() {
    modalMenu.classList.toggle('hidden');
    if (modalMenu.classList.contains('hidden')) {
        btnMenuToggle.classList.remove('is-active');
    } else {
        btnMenuToggle.classList.add('is-active');
    }
}

function closeModalMenu() {
    if (!modalMenu.classList.contains('hidden')) {
        modalMenu.classList.add('hidden');
    }
    if (btnMenuToggle.classList.contains('is-active')) {
        btnMenuToggle.classList.remove('is-active');
    }
}

btnMenuToggle.addEventListener('click', () => {
    toggleModalMenu();
});

btnCloseMenu.addEventListener('click', () => {
    closeModalMenu();
});

modalMenu.addEventListener('click', (event) => {
    if (event.target.id === 'modal-menu') {
        closeModalMenu();
    }
});

/* Script para controle de visibilidade dos botões sticky */

const btnStickyTransaction = document.getElementById('btn-add-transaction-mobile');
const btnStickyCategory = document.getElementById('btn-add-category-mobile');

function updateStickyButtonsVisibility() {
    const activeView = document.querySelector('.app-view:not(.hidden)');
    const activeViewId = activeView ? activeView.id : null;

    if (activeViewId === 'dashboard-view' || activeViewId === 'statements-view') {
        btnStickyTransaction.classList.remove('hidden');
        btnStickyCategory.classList.add('hidden');
    } else if (activeViewId === 'categories-view') {
        btnStickyTransaction.classList.add('hidden');
        btnStickyCategory.classList.remove('hidden');
    } else {
        btnStickyTransaction.classList.add('hidden');
        btnStickyCategory.classList.add('hidden');
    }
}

/* Script para controle do formulário de transações */

const modalTransactionForm = document.getElementById('modal-transaction-form');
const btnCloseTransactionForm = document.getElementById('btn-close-transaction-form');
const openTransactionFormButtons = [
    document.getElementById('btn-add-transaction-dashboard'),
    document.getElementById('btn-add-transaction-statements'),
    document.getElementById('btn-add-transaction-mobile')
];
const transactionForm = modalTransactionForm.querySelector('#transaction-form');
const inputAmount = document.getElementById('transaction-form-amount');

function resetInputAmountIfEmpty() {
    if (inputAmount.value === '') {
        inputAmount.value = 'R$ 0,00';
    }
}

function forceCursorToEnd(el) {
    const len = el.value.length;
    el.setSelectionRange(len, len);
}

function openTransactionModal(transaction = null) {
    const title = modalTransactionForm.querySelector('.transaction-form-title');
    const description = modalTransactionForm.querySelector('.transaction-form-description');
    const submitButton = modalTransactionForm.querySelector('button[type="submit"]');
    const typeSelect = document.getElementById('transaction-form-type');

    if (transaction) {
        selectedTransactionId = transaction.id;
        title.textContent = 'Editar Transação';
        description.textContent = 'Atualize os dados abaixo para editar sua transação.';
        submitButton.textContent = 'Salvar alterações';

        const typeValue = transaction.amount > 0 ? 'income' : 'outcome';
        Renderer.renderCategoryOptions('transaction-form-category', typeValue);
        fillTransactionForm(transaction);
    } else {
        title.textContent = 'Nova Transação';
        description.textContent = 'Preencha os dados abaixo para registrar sua transação.';
        submitButton.textContent = 'Registrar transação';
        transactionForm.reset();

        typeSelect.value = 'outcome';
        Renderer.renderCategoryOptions('transaction-form-category', typeSelect.value);
    }

    modalTransactionForm.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function fillTransactionForm(transaction) {
    const form = document.getElementById('transaction-form');

    form.querySelector('[name="description"]').value = transaction.description;
    form.querySelector('[name="date"]').value = transaction.date;
    form.querySelector('[name="categoryId"]').value = transaction.categoryId;

    const typeValue = transaction.amount > 0 ? 'income' : 'outcome';
    form.querySelector('[name="type"]').value = typeValue;

    const rawAmount = Math.abs(transaction.amount);
    const amountInput = document.getElementById('transaction-form-amount');
    amountInput.value = Utils.formatCurrency(rawAmount);
}

function closeTransactionModal() {
    modalTransactionForm.classList.add('hidden');
    document.body.classList.remove('modal-open');
    selectedTransactionId = null;
}

openTransactionFormButtons.forEach(button => {
    button.addEventListener('click', () => {
        openTransactionModal();
    });
});

btnCloseTransactionForm.addEventListener('click', () => {
    closeTransactionModal();
});

modalTransactionForm.addEventListener('click', (event) => {
    if (event.target.id === 'modal-transaction-form') {
        closeTransactionModal();
    }
});

modalTransactionForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(transactionForm);
    const rawData = Object.fromEntries(formData.entries());
    const cleanData = SanitizationService.cleanTransaction(rawData);
    const validationResult = ValidationService.validateTransaction(cleanData);
    const activeView = document.querySelector('.app-view:not(.hidden)');
    const activeViewId = activeView ? activeView.id : null;

    if (!validationResult.isValid) {
        alert("Por favor, corrija os seguintes erros:\n\n" + validationResult.errors.join("\n"));
        return;
    }

    if (selectedTransactionId) {
        TransactionService.updateTransaction(selectedTransactionId, cleanData);
        updateViewContent(activeViewId);
        transactionForm.reset();
    } else {
        TransactionService.addTransaction(cleanData);
        updateViewContent(activeViewId);
        transactionForm.reset();
    }

    closeTransactionModal();
});

inputAmount.addEventListener('input', (event) => {
    let value = event.target.value;

    value = value.replace(/\D/g, '');

    if (value === '') {
        event.target.value = 'R$ 0,00';
        return;
    }

    const cents = parseInt(value, 10);

    event.target.value = Utils.formatCurrency(cents);
    forceCursorToEnd(event.target);
});

inputAmount.addEventListener('keydown', (event) => {
    const forbiddenKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

    if (forbiddenKeys.includes(event.key)) {
        event.preventDefault();
    }
});

inputAmount.addEventListener('click', (event) => {
    resetInputAmountIfEmpty();
    forceCursorToEnd(event.target)
});

inputAmount.addEventListener('focus', (event) => {
    resetInputAmountIfEmpty();
    forceCursorToEnd(event.target)
});

document.getElementById('transaction-form-type').addEventListener('change', (event) => {
    const selectedType = event.target.value;
    Renderer.renderCategoryOptions('transaction-form-category', selectedType);
});

/* Script para controle do formulário de categorias */

const modalCategoryForm = document.getElementById('modal-category-form');
const btnCloseCategoryForm = document.getElementById('btn-close-category-form');
const categoryForm = document.getElementById('category-form');
const openCategoryFormButtons = [
    document.getElementById('btn-add-category-desktop'),
    document.getElementById('btn-add-category-mobile')
];

function openCategoryModal(category = null) {
    const title = modalCategoryForm.querySelector('.category-form-title');
    const description = modalCategoryForm.querySelector('.category-form-description');
    const submitButton = modalCategoryForm.querySelector('button[type="submit"]');

    if (category) {
        selectedCategoryId = category.id;
        title.textContent = 'Editar Categoria';
        description.textContent = 'Atualize os dados abaixo para editar sua categoria.';
        submitButton.textContent = 'Salvar alterações';
        
        Renderer.renderIconOptions('category-icon');
        fillCategoryForm(category);
    } else {
        title.textContent = 'Nova Categoria';
        description.textContent = 'Preencha os dados abaixo para registrar sua categoria.';
        submitButton.textContent = 'Registrar Categoria';
        categoryForm.reset();
        
        Renderer.renderIconOptions('category-icon');
    }

    modalCategoryForm.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function fillCategoryForm(category) {
    categoryForm.querySelector('[name="name"]').value = category.name;
    categoryForm.querySelector('[name="type"]').value = category.type;
    categoryForm.querySelector('[name="iconId"]').value = category.iconId;
}

function closeCategoryModal() {
    modalCategoryForm.classList.add('hidden');
    document.body.classList.remove('modal-open');
    selectedCategoryId = null;
}

openCategoryFormButtons.forEach(button => {
    button.addEventListener('click', () => {
        openCategoryModal();
    });
});

btnCloseCategoryForm.addEventListener('click', () => {
    closeCategoryModal();
});

modalCategoryForm.addEventListener('click', (event) => {
    if (event.target.id === 'modal-category-form') {
        closeCategoryModal();
    }
});

modalCategoryForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData.entries());
    const cleanData = SanitizationService.cleanCategory(rawData);
    const validationResult = ValidationService.validateCategory(cleanData);
    const activeView = document.querySelector('.app-view:not(.hidden)');
    const activeViewId = activeView ? activeView.id : null;

    if (!validationResult.isValid) {
        alert("Por favor, corrija os seguintes erros:\n\n" + validationResult.errors.join("\n"));
        return;
    }

    if (selectedCategoryId) {
        CategoryService.updateCategory(selectedCategoryId, cleanData);
        updateViewContent(activeViewId);
        form.reset();
    } else {
        CategoryService.addCategory(cleanData);
        updateViewContent(activeViewId);
        form.reset();
    }

    closeCategoryModal();
});

/* Script para controle do modal de detalhes da transação */

const modalTransactionDetails = document.getElementById('modal-transaction-details');
const btnCloseTransactionDetails = document.getElementById('btn-close-transaction-details');
const btnDeleteTransaction = document.getElementById('btn-delete-transaction');
const btnEditTransaction = document.getElementById('btn-edit-transaction');

function openTransactionDetailsModal(transactionId) {
    selectedTransactionId = transactionId;

    const transaction = TransactionService.getTransactionById(transactionId);
    if (!transaction) {
        alert("Transação não encontrada.");
        return;
    }

    const categoryData = CategoryService.getCategoryById(transaction.categoryId);
    const categoryIcon = IconHelper.getIconById(categoryData.iconId);

    const iconContainer = modalTransactionDetails.querySelector('.category-icon-bg');
    const categoryNameElem = modalTransactionDetails.querySelector('.transaction-category span');
    const descriptionElem = modalTransactionDetails.querySelector('.transaction-details-description');
    const amountElem = modalTransactionDetails.querySelector('.transaction-details-amount');
    const dateElem = modalTransactionDetails.querySelector('.transaction-details-date');

    const isNegative = transaction.amount < 0;

    const [year, month, day] = transaction.date.split('-');
    const dateFormatted = `${day}/${month}/${year}`;

    if (iconContainer) iconContainer.innerHTML = categoryIcon;
    if (categoryNameElem) categoryNameElem.textContent = categoryData.name;
    if (descriptionElem) descriptionElem.textContent = transaction.description;

    if (amountElem) {
        amountElem.textContent = `${isNegative ? '' : '+'}${Utils.formatCurrency(transaction.amount)}`;
        amountElem.classList.toggle('is-negative', isNegative);
    }

    if (dateElem) {
        dateElem.textContent = dateFormatted;
        dateElem.setAttribute('datetime', transaction.date);
    }

    modalTransactionDetails.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeTransactionDetailsModal() {
    modalTransactionDetails.classList.add('hidden');
    document.body.classList.remove('modal-open');
    selectedTransactionId = null;
}

document.body.addEventListener('click', (event) => {
    const item = event.target.closest('.transaction-item');
    if (item) {
        const transactionId = item.dataset.id;
        openTransactionDetailsModal(transactionId);
    }
});

btnCloseTransactionDetails.addEventListener('click', () => {
    closeTransactionDetailsModal();
});

modalTransactionDetails.addEventListener('click', (event) => {
    if (event.target.id === 'modal-transaction-details') {
        closeTransactionDetailsModal();
    }
});

btnEditTransaction.addEventListener('click', () => {
    if (selectedTransactionId) {
        const transaction = TransactionService.getTransactionById(selectedTransactionId);
        closeTransactionDetailsModal();
        if (transaction) {
            closeTransactionDetailsModal();
            openTransactionModal(transaction);
        }
    }
});

btnDeleteTransaction.addEventListener('click', () => {
    if (selectedTransactionId) {
        openConfirmModal(selectedTransactionId,
            "Excluir transação",
            "Você tem certeza que deseja remover esta transação?<br><br><strong>Essa ação não poderá ser desfeita</strong> e o valor será removido do seu saldo atual.",
            (idToDelete) => {
                TransactionService.deleteTransaction(idToDelete);
                const activeView = document.querySelector('.app-view:not(.hidden)');
                if (activeView) {
                    updateViewContent(activeView.id);
                }
            }
        );
    }
});

/* Script para controle do modal de confirmação de exclusão */

const modalDelete = document.getElementById('modal-confirm');
const btnCancelDelete = document.getElementById('btn-confirm-cancel');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

function openConfirmModal(idToDelete, title, description, confirmCallback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-description').innerHTML = description;

    abortController.abort();
    abortController = new AbortController();

    btnConfirmDelete.addEventListener('click', () => {
        confirmCallback(idToDelete);
        closeConfirmModal();
        if (!modalTransactionDetails.classList.contains('hidden')) {
            closeTransactionDetailsModal();
        }
    }, { signal: abortController.signal, once: true });

    modalDelete.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeConfirmModal() {
    abortController.abort();
    abortController = new AbortController();

    modalDelete.classList.add('hidden');
    if (modalTransactionDetails.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
    }
}

btnCancelDelete.addEventListener('click', () => {
    closeConfirmModal();
});

modalDelete.addEventListener('click', (event) => {
    if (event.target.id === 'modal-confirm') {
        closeConfirmModal();
    }
});

/* Script para controle dos cards de categoria */

document.body.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.btn-action-edit');

    if (editBtn && document.getElementById('categories-view').classList.contains('hidden') === false) {
        const categoryCard = editBtn.closest('.category-card');
        const categoryId = categoryCard.dataset.id;
        const category = CategoryService.getCategoryById(categoryId);

        openCategoryModal(category);
    }
});

document.body.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.btn-action-delete');

    if (deleteBtn && document.getElementById('categories-view').classList.contains('hidden') === false) {
        const categoryCard = deleteBtn.closest('.category-card');
        const categoryId = categoryCard.dataset.id;
        const categoryName = categoryCard.querySelector('.category-name').textContent;

        openConfirmModal(
            categoryId,
            'Excluir categoria',
            `Tem certeza que deseja excluir a categoria <strong>${categoryName}</strong>?<br><br>Categorias já utilizadas não podem ser excluídas.`,
            (id) => {
                console.log("Deletando categoria:", id);
            }
        );
    }
});

/* Script para controle do botão de exportação de extrato */

const btnExportAction = document.getElementById('btn-export-action');
const btnExportToggle = document.getElementById('btn-export-toggle');
const exportMenuOptions = document.getElementById('export-menu-options');

function toggleExportMenu() {
    exportMenuOptions.classList.toggle('hidden');
}

function closeExportMenu() {
    exportMenuOptions.classList.add('hidden');
}

function exportData(format) {
    console.log("Exportando dados no formato:", format);
    /* Lógica para exportar os dados no formato selecionado */
}

btnExportToggle.addEventListener('click', () => {
    toggleExportMenu();
});

exportMenuOptions.addEventListener('click', (event) => {
    const option = event.target.closest('.export-option');
    const currentFormat = btnExportToggle.querySelector('.current-format');
    btnExportToggle.dataset.format = option.dataset.format;
    currentFormat.textContent = option.textContent;
    toggleExportMenu();
});

btnExportAction.addEventListener('click', () => {
    const format = btnExportToggle.dataset.format;
    exportData(format);
});

/* Script para controle do botão de voltar ao topo */

const btnBackToTop = document.querySelector('.btn-back-to-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        btnBackToTop.classList.add('is-visible');
    } else {
        btnBackToTop.classList.remove('is-visible');
    }
});

btnBackToTop.addEventListener('click', () => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* Script de controle da paginação */

const itemsPerPageSelect = document.getElementById('items-per-page');
const btnPrevPage = document.querySelector('.page-btn[aria-label="Página anterior"]');
const btnNextPage = document.querySelector('.page-btn[aria-label="Próxima página"]');
const pageNumbersContainer = document.querySelector('.page-numbers-container');

const inputDateFrom = document.getElementById('date-from');
const inputDateTo = document.getElementById('date-to');

function updatePaginationInfo(paginationData) {
    const infoText = document.querySelector('.current-shown-items');
    if (!infoText) return;

    const start = (currentPagination.page - 1) * currentPagination.itemsPerPage + 1;
    const end = Math.min(currentPagination.page * currentPagination.itemsPerPage, paginationData.totalItems);

    infoText.textContent = `${paginationData.totalItems === 0 ? 0 : start}-${end} de ${paginationData.totalItems} itens`;
}

function updatePaginationSelect() {
    const options = itemsPerPageSelect.querySelectorAll('option');
    options.forEach(option => option.removeAttribute('selected'));

    itemsPerPageSelect.value = currentPagination.itemsPerPage.toString();
    const selectedOption = itemsPerPageSelect.querySelector(`option[value="${currentPagination.itemsPerPage}"]`);
    if (selectedOption) {
        selectedOption.setAttribute('selected', 'selected');
    }
}

function updatePaginationButtons(paginationData) {
    const totalPages = paginationData.totalPages || 1;

    btnPrevPage.disabled = currentPagination.page === 1;
    btnNextPage.disabled = currentPagination.page === totalPages || paginationData.totalItems === 0;

    pageNumbersContainer.innerHTML = '';

    let startPage = Math.max(1, currentPagination.page - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btnPage = document.createElement('button');
        btnPage.className = 'page-btn';
        if (i === currentPagination.page) {
            btnPage.classList.add('is-active');
        }
        btnPage.textContent = i;

        btnPage.addEventListener('click', () => {
            currentPagination.page = i;
            updateViewContent('statements-view');
        });

        pageNumbersContainer.appendChild(btnPage);
    }

    if (paginationData.totalItems === 0) {
        pageNumbersContainer.innerHTML = '<button class="page-btn is-active" disabled>1</button>';
    }
}

itemsPerPageSelect.addEventListener('change', (event) => {
    let itemsPerPageNumber = parseInt(event.target.value);
    if (isNaN(itemsPerPageNumber) || itemsPerPageNumber <= 0) {
        itemsPerPageNumber = 10;
    }
    currentPagination.itemsPerPage = itemsPerPageNumber;
    SettingsService.setItemsPerPage(itemsPerPageNumber);
    currentPagination.page = 1;

    updateViewContent('statements-view');
});

btnPrevPage.addEventListener('click', () => {
    if (currentPagination.page > 1) {
        currentPagination.page--;
        updateViewContent('statements-view');
    }
});

btnNextPage.addEventListener('click', () => {
    const data = TransactionService.getFilteredAndPaginated({}, currentPagination);
    if (currentPagination.page < data.totalPages) {
        currentPagination.page++;
        updateViewContent('statements-view');
    }
});

inputDateFrom.addEventListener('change', (event) => {
    const dateTo = inputDateTo.value;
    dateFilters.from = event.target.value;

    if (dateFilters.from > dateTo) {
        dateFilters.from = dateTo;
        inputDateFrom.value = dateTo;
    }

    currentPagination.page = 1;
    updateViewContent('statements-view');
});

// Escuta mudança na data final
inputDateTo.addEventListener('change', (event) => {
    const dateFrom = inputDateFrom.value;
    dateFilters.to = event.target.value;

    if (dateFilters.to < dateFrom) {
        dateFilters.to = dateFrom;
        inputDateTo.value = dateFrom;
    }

    currentPagination.page = 1;
    updateViewContent('statements-view');
});