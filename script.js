/* Script de inicialização do app */

window.addEventListener('DOMContentLoaded', () => {
    const defaultViewId = 'dashboard-view';
    showView(defaultViewId);
});

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
}

function updateNavLinksActiveState(viewId) {
    navLinks.forEach(link => {
        link.classList.toggle('is-active', link.dataset.view === viewId);
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
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









const transactionForm = document.querySelector('#id-do-form');
const descriptionInput = document.querySelector('#id-da-descricao');
const amountInput = document.querySelector('#id-do-valor');
const balanceDisplay = document.querySelector('#id-do-saldo');
const transactionList = document.querySelector('#id-da-lista');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

transactionForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // 1. Validar campos
    // 2. Converter valor para número
    // 3. Chamar a lógica de adição
});