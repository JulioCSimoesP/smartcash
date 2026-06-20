# 💰 SmartCash

**Seu Dashboard Financeiro Inteligente**

O SmartCash é uma ferramenta de gestão financeira pessoal desenvolvida para oferecer uma experiência rápida, leve e totalmente privada. A aplicação permite que o usuário monitore suas finanças em tempo real, registrando entradas e saídas de forma simplificada, tudo isso sem a necessidade de cadastros complexos ou conexão com servidores externos.

---

## 🎯 Proposta e Objetivo

O principal objetivo deste projeto é entregar uma Single Page Application (SPA) funcional que ajude o usuário a responder de forma clara à pergunta: "Para onde está indo meu dinheiro?". 
Diferente de planilhas complexas ou aplicativos burocráticos, o SmartCash foca na agilidade, acessibilidade e no controle total dos dados por parte do usuário.

---

### ✨ Funcionalidades Principais

*   **Gestão de Transações:** CRUD (Criação, Leitura, Atualização e Exclusão) completo para o controle detalhado de receitas e despesas.
*   **Organização Inteligente:** Gerenciamento de categorias que permite classificar e compreender melhor os hábitos de consumo.
*   **Cálculo Automático:** Atualização dinâmica e em tempo real do saldo líquido e dos totais de entradas e saídas.
*   **Exportação de Dados:** Funcionalidade para extrair as informações financeiras, garantindo a portabilidade e a segurança do usuário.
*   **Privacidade e Persistência:** Armazenamento local utilizando a Web Storage API, garantindo que as informações fiquem salvas apenas no navegador, sem envio para servidores de terceiros.

---

## 📋 Planejamento e Documentação Técnica

A construção do SmartCash foi orientada por práticas sólidas de engenharia de software e planejamento prévio. Abaixo estão os artefatos que guiaram o escopo, a arquitetura e o desenvolvimento do projeto:

*   [📄 **Visão do Projeto**](https://juliocsimoesp.github.io/smartcash/assets/documents/visao_do_projeto_smartcash.docx) - Definição do problema, solução proposta, público-alvo e limites do escopo.
*   [📝 **Documento de Requisitos**](https://juliocsimoesp.github.io/smartcash/assets/documents/requisitos_smartcash.docx) - Especificação detalhada dos requisitos funcionais e não-funcionais da aplicação.
*   [📊 **Diagrama de Casos de Uso**](https://juliocsimoesp.github.io/smartcash//assets/documents/Diagrama_de_Casos_de_Uso.drawio.pdf) - Mapeamento das interações fundamentais entre o usuário e o sistema.
*   [🗄️ **Modelo de Dados**](https://juliocsimoesp.github.io/smartcash/assets/documents/Modelo_de_Dados.drawio.pdf) - Estruturação das entidades de transações e categorias armazenadas localmente.
*   [📐 **Wireframe**](https://www.figma.com/design/HQjmo7edFz9qg6pmWXSHE9/SmartCash?node-id=0-1&t=MPQrNgsFb44Xa9YN-1) - Prototipagem visual focada na usabilidade e na abordagem *Mobile First*.
*   [💡 **Registro de Decisões Técnicas**](https://juliocsimoesp.github.io/smartcash/assets/documents/registro_de_decisoes_tecnicas.docx) - Documentação das motivações por trás das escolhas arquiteturais e de tecnologias.
*   [✅ **Quadro de Tarefas**](https://trello.com/invite/b/69eace925868e158f1cc06e9/ATTI33f10534e8019ae97935be337d0ac084C390F9B6/projeto-smartcash) - Acompanhamento ágil e gerenciamento das etapas de desenvolvimento.

---

## 🛠️ Tecnologias Utilizadas

Para este projeto, optou-se pelo uso de tecnologias nativas para garantir máxima performance, leveza e demonstrar domínio sobre os fundamentos do desenvolvimento web:

*   **HTML5:** Estruturação semântica para melhor acessibilidade e SEO.
*   **CSS3:** Estilização moderna, fluida e responsiva, utilizando variáveis para manutenção do guia de estilos.
*   **JavaScript (Vanilla):** Lógica de programação pura, manipulação dinâmica do DOM e gestão eficiente de eventos.
*   **Web Storage API (LocalStorage):** Persistência de dados assíncrona diretamente no lado do cliente.

---

## 📂 Estrutura de Arquivos

Seguindo o padrão de separação de responsabilidades, o projeto está organizado de forma simples e direta na raiz:

```text
/
├── index.html    # Estrutura e marcação da página
├── style.css     # Estilização e regras de responsividade
└── script.js     # Lógica, cálculos e manipulação de dados
└── assets/       # Arquivos utilizados no projeto
        └── favicon/     # Arquivos de favicon
        └── images/      # Arquivos de imagem (png/jpeg)
        └── documents/   # Documentos do projeto
        └── svg/         # Código fonte dos SVGs
                └── category/     # SVGs de ícones de categorias
                └── utility/      # SVGs do sistema
```
---

## 🔧 Como visualizar o projeto

Como a aplicação foi construída com tecnologias nativas de Front-end, executá-la em seu ambiente local é um processo extremamente rápido:

1. Clone este repositório em sua máquina local:
   
```
git clone [https://github.com/SeuUsuario/smartcash.git](https://github.com/SeuUsuario/smartcash.git)
```

2. Abra o arquivo index.html diretamente em qualquer navegador web de sua preferência.

3. Opcional: Para uma experiência de visualização aprimorada durante edições, recomenda-se o uso da extensão Live Server no VS Code.

---

## 🔗 Acesso Online

O projeto está publicado e totalmente funcional. Você pode acessar a aplicação diretamente através do link abaixo:

[👉 **Acessar SmartCash**](https://juliocsimoesp.github.io/smartcash/)

---

Desenvolvido por [**Júlio Simões**](https://github.com/JulioCSimoesP)

[Whatsapp](https://wa.me/5511942579948?text=Olá%20Júlio,%20vi%20seu%20portfólio!) | [LinkedIn](https://www.linkedin.com/in/julio-simoes-dev/)
