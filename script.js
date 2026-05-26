/* Script de inicialização do app */

window.addEventListener('DOMContentLoaded', () => {
    const defaultViewId = 'dashboard-view';
    showView(defaultViewId);
});

let abortController = new AbortController();
let selectedTransactionId = null;
let selectedCategoryId = null;

/* Script para controle de navegação entre as views */

const views = document.querySelectorAll('.app-view');
const navLinks = document.querySelectorAll('.nav-link, .menu-btn, .logo-link, .btn-redirect');

function showView(viewId) {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateStickyButtonsVisibility();
    updateNavLinksActiveState(viewId);
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

function openTransactionModal(transaction = null) {
    const title = modalTransactionForm.querySelector('.transaction-form-title');
    const description = modalTransactionForm.querySelector('.transaction-form-description');
    const submitButton = modalTransactionForm.querySelector('button[type="submit"]');

    if (transaction) {
        selectedTransactionId = transaction.id;
        title.textContent = 'Editar Transação';
        description.textContent = 'Atualize os dados abaixo para editar sua transação.';
        submitButton.textContent = 'Salvar alterações';

        /* Lógica para preencher os campos do formulário com os dados da transação a ser editada */
    } else {
        title.textContent = 'Nova Transação';
        description.textContent = 'Preencha os dados abaixo para registrar sua transação.';
        submitButton.textContent = 'Registrar transação';

        /* Lógica para limpar os campos do formulário */
    }

    modalTransactionForm.classList.remove('hidden');
    document.body.classList.add('modal-open');
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

    if (!validationResult.isValid) {
        alert("Por favor, corrija os seguintes erros:\n\n" + validationResult.errors.join("\n"));
        return;
    }

    console.log("Dados do formulário:", cleanData);

    if (selectedTransactionId) {
        // Lógica para editar a transação
    } else {
        StorageService.addTransaction(cleanData);
    }

    closeTransactionModal();
});

/* Script para controle do formulário de categorias */

const modalCategoryForm = document.getElementById('modal-category-form');
const btnCloseCategoryForm = document.getElementById('btn-close-category-form');
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
        /* Lógica para preencher os campos do formulário com os dados da categoria a ser editada */
    } else {
        title.textContent = 'Nova Categoria';
        description.textContent = 'Preencha os dados abaixo para registrar sua categoria.';
        submitButton.textContent = 'Registrar Categoria';
        /* Lógica para limpar os campos do formulário */
    }

    modalCategoryForm.classList.remove('hidden');
    document.body.classList.add('modal-open');
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

    if (selectedCategoryId) {
        console.log("Editando categoria com ID:", selectedCategoryId);
        // Lógica para editar a categoria
    } else {
        console.log("Registrando nova categoria");
        // Lógica para registrar uma nova categoria
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
    /* Lógica para carregar os detalhes da transação usando o ID e exibir no modal */
    console.log("Abrindo modal de detalhes da transação com ID:", transactionId)

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
        console.log("Editando transação com ID:", selectedTransactionId);
        const transaction = {
            id: selectedTransactionId,
        };/* Lógica para buscar os dados da transação usando o ID selecionado */
        closeTransactionDetailsModal();
        openTransactionModal(transaction);
    }
});

btnDeleteTransaction.addEventListener('click', () => {
    if (selectedTransactionId) {
        openConfirmModal(selectedTransactionId,
            "Excluir transação",
            "Você tem certeza que deseja remover esta transação?<br><br><strong>Essa ação não poderá ser desfeita</strong> e o valor será removido do seu saldo atual.",
            (idToDelete) => {
                // Lógica para excluir a transação usando o ID
                console.log("Confirmando exclusão do item com ID:", idToDelete);
            }
        );
    }
});

/* Script para controle do modal de confirmação de exclusão */

const modalConfirmDelete = document.getElementById('modal-confirm');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
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

    modalConfirmDelete.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeConfirmModal() {
    abortController.abort();
    abortController = new AbortController();

    modalConfirmDelete.classList.add('hidden');
    if (modalTransactionDetails.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
    }
}

btnConfirmCancel.addEventListener('click', () => {
    closeConfirmModal();
});

modalConfirmDelete.addEventListener('click', (event) => {
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
        const category = {
            id: categoryId,
        }; /* Lógica para buscar os dados da categoria usando o ID */

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

/* Script de controle do LocalStorage para persistência de dados */

const StorageService = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    addTransaction(transactionData) {
        const transactionsArray = this.get('transactions');
        const newTransaction = ModelService.createTransaction(transactionData);
        transactionsArray.push(newTransaction);
        this.save('transactions', transactionsArray);
    },

    getTransactions() {
        return this.get('transactions');
    }
};

const ModelService = {
    createTransaction(data) {
        return {
            id: crypto.randomUUID(),
            description: data.description,
            amount: data.amount,
            date: data.date,
            categoryId: data.categoryId
        };
    },

    createCategory(data) {
        return {
            id: crypto.randomUUID(),
            name: data.name,
            iconName: data.iconName || 'default-icon',
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
        if (/[a-zA-Z]/.test(value)) {
            return 0;
        }

        const outputValue = parseInt(value.replace(/\D/g, ''), 10);

        if (isNaN(outputValue)) {
            return 0;
        }

        return outputValue;
    }
};

const SanitizationService = {
    stripHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    cleanDate(dateString) {
        const date = new Date(dateString);

        if (date instanceof Date && !isNaN(date)) {
            return dateString;
        }

        return new Date().toISOString().split('T')[0];
    },

    cleanType(value) {
        if (value === 'income') return true;
        if (value === 'outcome') return false;
        return false;
    },

    cleanTransaction(data) {
        const rawAmount = Math.abs(Utils.parseCurrency(data.amount) || 0);
        const isIncome = this.cleanType(data.type);
        const finalAmount = isIncome ? rawAmount : -rawAmount;

        return {
            description: this.stripHTML(data.description).trim(),
            amount: finalAmount,
            date: this.cleanDate(data.date),
            categoryId: this.stripHTML(data.categoryId).trim()
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

        const today = new Date().toISOString().split('T')[0];
        if (data.date > today) {
            errors.push("Não é permitido registrar transações com datas futuras.");
        }

        /* Validação de categoria comentada por enquanto, pois o modelo de categorias ainda não está implementado. */
        // const categories = StorageService.getCategories();
        // const categoryExists = categories.find(c => c.id === data.categoryId);
        // if (!categoryExists) {
        //     errors.push("Categoria selecionada inválida.");
        // }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};