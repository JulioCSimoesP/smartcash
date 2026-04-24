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