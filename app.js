// ========================================================================
// VARIÁVEIS GLOBAIS
// ========================================================================

// !!! IMPORTANTE !!!
// Esta é a URL da sua API do Google Apps Script (do "Code.gs (API)")
// Ela foi obtida após a "Nova Implantação" do tipo "Qualquer pessoa"
const API_URL = "https://script.google.com/macros/s/AKfycbx1saGajeJTxGsdHjf807t4auDLz26r1FbARuXGL3ftbE8XcHqiqYc3hm4wH9tUMvLhAg/exec"; // ATUALIZE SE TIVER UMA NOVA URL

// Armazena o nome do usuário logado
let currentUserName = '';
// Armazena o tipo de documento selecionado (aba)
let currentDocumentType = 'Memorando';

// Seletores de Elementos da UI
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const historyScreen = document.getElementById('historyScreen');
const successScreen = document.getElementById('successScreen');

const appHeader = document.getElementById('appHeader');
const appName = document.getElementById('appName');
const appLogo = document.getElementById('appLogo');

const loginButton = document.getElementById('loginButton');
const loginSpinner = document.getElementById('loginSpinner');
const loginError = document.getElementById('loginError');
const nameInput = document.getElementById('nameInput');

const requestButton = document.getElementById('requestButton');
const historyButton = document.getElementById('historyButton');
const requestSpinner = document.getElementById('requestSpinner');
const requestError = document.getElementById('requestError');
const userNameSpan = document.getElementById('userName');

const quantityInput = document.getElementById('quantityInput');
const purposeInput = document.getElementById('purposeInput');

// Abas
const memoTab = document.getElementById('memoTab');
const oficioTab = document.getElementById('oficioTab');

const generatedNumbers = document.getElementById('generatedNumbers');
const newRequestButton = document.getElementById('newRequestButton');

const historyContent = document.getElementById('historyContent');
const historySpinner = document.getElementById('historySpinner');
const backButton = document.getElementById('backButton');

// Modal
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancelButton = document.getElementById('modalCancelButton');
const modalConfirmButton = document.getElementById('modalConfirmButton');

// Guarda a ação pendente do modal (ex: a função de cancelar)
let pendingAction = null;

// ========================================================================
// FUNÇÃO HELPER (AJUDA): sleep
// ========================================================================

/**
  * Pausa a execução por um determinado número de milissegundos.
  * @param {number} ms - O tempo para "dormir" em milissegundos.
  */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================================================
// FUNÇÃO HELPER (AJUDA): callApi
// ========================================================================

/**
  * Função central para fazer chamadas à nossa API do Google Script.
  * AGORA SÓ USA 'POST', que é mais robusto contra erros de CORS.
  * Inclui lógica de retentativa automática para "cold starts".
  * @param {string} action - A ação a ser executada (ex: 'getAppDetails', 'checkUser').
  * @param {object} payload - O objeto de dados a ser enviado (ex: { name: 'Thiego' }).
  * @returns {Promise<object>} O objeto 'data' da resposta da API.
  */
async function callApi(action, payload = {}) {
  const MAX_RETRIES = 3; // Tentar 3 vezes
  const RETRY_DELAY = 2000; // Esperar 2 segundos entre tentativas
  const url = API_URL;

  // Loop de Retentativa
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Usar text/plain é um truque comum para evitar "preflight"
        },
        body: JSON.stringify({
          action: action,
          payload: payload // O payload agora contém os dados
        }),
      };

      const response = await fetch(url, options);
      
      const textResponse = await response.text();
      let data;

      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error(`Tentativa ${attempt}: Erro ao parsear JSON:`, textResponse);
        // Se o JSON falhou, pode ser um erro HTML do Google
        if (textResponse.includes("não pôde ser encontrado")) {
          throw new Error("Erro de API: Script não encontrado. Verifique a URL.");
        }
         if (textResponse.includes("TypeError:") || textResponse.includes("ReferenceError:")) {
          throw new Error("Erro crítico no servidor (Code.gs). Verifique os logs.");
        }
        throw new Error("Resposta inesperada do servidor.");
      }
      
      if (data.status === 'success') {
        return data.data; // SUCESSO! Retorna os dados.
      } else {
        // Se o servidor respondeu com um erro conhecido (ex: "Usuário não encontrado")
        // Lança o erro para ser tratado pela função chamadora
        throw new Error(data.message);
      }

    } catch (error) {
      console.warn(`Tentativa ${attempt} falhou: ${error.message}`);
      
      // Verifica se foi um erro de rede (ex: "Failed to fetch")
      // Este é o erro que queremos tentar de novo
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        if (attempt === MAX_RETRIES) {
          // Se foi a última tentativa, desiste e lança o erro
          throw new Error(`Falha ao conectar à API após ${MAX_RETRIES} tentativas. O servidor pode estar offline ou em "cold start".`);
        }
        // Se não foi a última tentativa, espera e tenta de novo
        console.log(`...esperando ${RETRY_DELAY / 1000}s para tentar de novo...`);
        await sleep(RETRY_DELAY);
      } else {
        // Se foi um erro de lógica (ex: "Usuário não encontrado"),
        // não adianta tentar de novo. Propaga o erro.
        throw error;
      }
    }
  }
}

// ========================================================================
// FUNÇÕES DA APLICAÇÃO
// ========================================================================

/**
  * Carrega os detalhes do app (logo e nome) assim que a página abre.
  */
async function loadAppDetails() {
  try {
    // Agora usa 'callApi' com POST
    const data = await callApi('getAppDetails');
    appName.textContent = data.appName;
    appLogo.src = data.logoUrl;
    appHeader.classList.remove('opacity-0');
  } catch (error) {
    appName.textContent = "Erro ao Carregar";
    appHeader.classList.remove('opacity-0');
    console.error(error);
    // Agora mostra o erro de forma mais inteligente (ex: "Falha ao conectar...")
    loginError.textContent = error.message;
  }
}

/**
  * Troca qual tela está visível.
  * @param {string} screenId - O ID da tela para mostrar ('login', 'main', 'history', 'success').
  */
function showScreen(screenId) {
  loginScreen.style.display = (screenId === 'login') ? 'block' : 'none';
  mainScreen.style.display = (screenId === 'main') ? 'block' : 'none';
  historyScreen.style.display = (screenId === 'history') ? 'block' : 'none';
  successScreen.style.display = (screenId === 'success') ? 'block' : 'none';
  
  // Limpa erros anteriores ao trocar de tela
  loginError.textContent = '';
  requestError.textContent = '';
}

/**
  * Lida com a tentativa de login.
  */
async function handleLogin() {
  const name = nameInput.value;
  if (!name) {
    loginError.textContent = 'Por favor, digite seu nome.';
    return;
  }

  loginButton.style.display = 'none';
  loginSpinner.style.display = 'block';
  loginError.textContent = '';

  try {
    // Agora usa 'callApi' com POST
    const userExists = await callApi('checkUser', { name: name });
    
    if (userExists) {
      currentUserName = name;
      userNameSpan.textContent = name.split(' ')[0]; // Mostra só o primeiro nome
      showScreen('main');
    } else {
      loginError.textContent = 'Usuário não cadastrado. Fale com o administrador.';
    }
  } catch (error) {
    loginError.textContent = `Erro: ${error.message}`;
  } finally {
    loginButton.style.display = 'block';
    loginSpinner.style.display = 'none';
  }
}

/**
  * Lida com a solicitação de números.
  */
async function handleRequest() {
  const quantity = quantityInput.value;
  const purpose = purposeInput.value;

  if (!purpose) {
    requestError.textContent = 'Por favor, preencha a finalidade.';
    return;
  }

  requestButton.style.display = 'none';
  historyButton.style.display = 'none';
  requestSpinner.style.display = 'block';
  requestError.textContent = '';

  try {
    const payload = {
      userName: currentUserName,
      quantity: parseInt(quantity, 10),
      purpose: purpose,
      tipo: currentDocumentType // Envia a aba ativa
    };
    
    const generated = await callApi('requestNumbers', payload);
    
    // Sucesso!
    onRequestSuccess(generated);
    
  } catch (error) {
    requestError.textContent = `Erro: ${error.message}`;
  } finally {
    requestButton.style.display = 'block';
    historyButton.style.display = 'block';
    requestSpinner.style.display = 'none';
  }
}

/**
  * Exibe a tela de sucesso com os números gerados.
  * @param {Array<string>} numbers - Array de números (ex: ["001/2025", "002/2025"]).
  */
function onRequestSuccess(numbers) {
  // Limpa números antigos
  generatedNumbers.innerHTML = ''; 
  
  // Cria as "cápsulas" (pills) para cada número
  numbers.forEach(num => {
    const pill = document.createElement('span');
    pill.className = 'bg-gray-700/50 border border-gray-600 text-white font-semibold px-4 py-2 rounded-full text-lg shadow-md';
    pill.textContent = num;
    generatedNumbers.appendChild(pill);
  });
  
  showScreen('success');
}

/**
  * Busca e exibe o histórico do usuário.
  */
async function showHistory() {
  showScreen('history');
  historyContent.innerHTML = '';
  historySpinner.style.display = 'block';

  try {
    // Agora usa 'callApi' com POST
    const history = await callApi('getUserHistory', { name: currentUserName });

    if (history.length === 0) {
      historyContent.innerHTML = '<p class="text-center text-gray-400">Você ainda não possui registros.</p>';
    } else {
      // Constrói o HTML do histórico
      history.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item bg-gray-900/50 p-3 rounded-lg border border-gray-700/50';
        itemDiv.id = `item-${item.rowNumber}`; // ID para fácil manipulação
        
        const isCanceled = item.status === 'Cancelado';
        if (isCanceled) {
          itemDiv.classList.add('canceled');
        }
        
        // Formata a data (se for válida)
        let date = 'Data inválida';
        try {
          // Garante que o fuso horário esteja correto (ajuste se necessário)
          date = new Date(item.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); 
        } catch(e) {}
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex justify-between items-start';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-shrink-0 mr-4'; // Para o texto não encostar no botão
        infoDiv.innerHTML = `
          <p class="text-sm text-gray-400">${date}</p>
          <p class="font-semibold text-lg text-blue-300 memo-number">Nº ${item.memoNumber} (${item.tipo})</p>
          <p class="text-gray-300 whitespace-pre-wrap">Finalidade: ${item.purpose}</p>
        `;
        contentDiv.appendChild(infoDiv);
        
        if (isCanceled) {
          const statusP = document.createElement('p');
          statusP.className = 'text-xs text-red-400 font-semibold mt-2';
          statusP.textContent = 'CANCELADO';
          infoDiv.appendChild(statusP);
        } else {
          // Adiciona o botão de cancelar
          const cancelButton = document.createElement('button');
          cancelButton.className = 'btn-cancel flex-shrink-0'; // flex-shrink-0 impede que o botão encolha
          cancelButton.title = 'Cancelar este item';
          cancelButton.innerHTML = '&times;'; // Símbolo "X"
          cancelButton.addEventListener('click', () => {
            handleCancelClick(item.rowNumber, item.memoNumber);
          });
          contentDiv.appendChild(cancelButton);
        }
        
        itemDiv.appendChild(contentDiv);
        historyContent.appendChild(itemDiv);
      });
    }
  } catch (error) {
    historyContent.innerHTML = `<p class="text-center text-red-400">Erro ao buscar histórico: ${error.message}</p>`;
  } finally {
    historySpinner.style.display = 'none';
  }
}

/**
  * Abre o modal de confirmação de cancelamento.
  */
function handleCancelClick(rowNumber, memoNumber) {
  // Configura a ação que o botão "Sim" vai executar
  pendingAction = () => executeCancel(rowNumber);
  
  modalTitle.textContent = 'Confirmar Cancelamento';
  modalMessage.textContent = `Tem certeza de que deseja cancelar o item Nº ${memoNumber}? Esta ação não pode ser desfeita.`;
  
  // Reseta o modal para o estado padrão
  modalConfirmButton.style.display = 'block';
  modalConfirmButton.className = 'btn-danger w-full py-3 rounded-lg text-white font-semibold';
  modalCancelButton.textContent = 'Não';
  
  confirmModal.classList.add('visible');
}

/**
  * Executa a ação de cancelar (chamada pela API).
  */
async function executeCancel(rowNumber) {
  // Mostra um spinner dentro do botão de confirmar
  modalConfirmButton.innerHTML = '<div class="spinner mx-auto" style="width: 24px; height: 24px; border-width: 2px;"></div>';
  modalConfirmButton.disabled = true;
  modalCancelButton.disabled = true;

  try {
    const payload = {
      rowNumber: rowNumber,
      userName: currentUserName
    };
    
    // Chama a API para cancelar
    const result = await callApi('cancelDocument', payload);
    
    // Se a API foi sucesso, atualiza a UI
    const itemDiv = document.getElementById(`item-${rowNumber}`);
    if (itemDiv) {
      itemDiv.classList.add('canceled');
      const btn = itemDiv.querySelector('.btn-cancel');
      if (btn) btn.remove();
      
      // Adiciona o texto "CANCELADO"
      const infoDiv = itemDiv.querySelector('.flex-shrink-0')?.parentNode || itemDiv.querySelector('div');
      const statusP = document.createElement('p');
      statusP.className = 'text-xs text-red-400 font-semibold mt-2';
      statusP.textContent = 'CANCELADO';
      infoDiv.appendChild(statusP);
    }
    
    // Fecha o modal
    confirmModal.classList.remove('visible');
    
  } catch (error) {
    // Se a API deu erro (ex: "Permissão negada"), mostra no modal
    modalTitle.textContent = 'Erro ao Cancelar';
    modalMessage.textContent = error.message;
    modalConfirmButton.style.display = 'none';
    modalCancelButton.textContent = 'Fechar';
  } finally {
    // Reseta o botão de confirmar
    modalConfirmButton.innerHTML = 'Sim, Cancelar';
    modalConfirmButton.disabled = false;
    modalCancelButton.disabled = false;
  }
}


/**
  * Controla os botões +/- do seletor de quantidade.
  * @param {number} amount - (+1) ou (-1).
  */
function adjustQuantity(amount) {
  let currentValue = parseInt(quantityInput.value, 10);
  currentValue += amount;
  if (currentValue < 1) {
    currentValue = 1; // Não permite menos que 1
  }
  quantityInput.value = currentValue;
}

/**
  * Controla o clique nas abas (Memo / Ofício).
  */
function handleTabClick(selectedType) {
  currentDocumentType = selectedType;
  if (selectedType === 'Memorando') {
    memoTab.classList.add('active');
    oficioTab.classList.remove('active');
  } else {
    memoTab.classList.remove('active');
    oficioTab.classList.add('active');
  }
}

// ========================================================================
// EVENT LISTENERS (Gatilhos)
// ========================================================================

// Inicia o app assim que a página carrega
document.addEventListener('DOMContentLoaded', () => {
  loadAppDetails();
  showScreen('login');
});

// Botão de Login
loginButton.addEventListener('click', handleLogin);
// Permite "Entrar" com a tecla Enter
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

// Botão de Solicitar
requestButton.addEventListener('click', handleRequest);

// Botão Meu Histórico
historyButton.addEventListener('click', showHistory);

// Botão Voltar (do Histórico)
backButton.addEventListener('click', () => {
  showScreen('main');
});

// Botão Solicitar Mais (da tela de Sucesso)
newRequestButton.addEventListener('click', () => {
  // Reseta os campos
  quantityInput.value = 1;
  purposeInput.value = '';
  showScreen('main');
});

// Botões das Abas
memoTab.addEventListener('click', () => handleTabClick('Memorando'));
oficioTab.addEventListener('click', () => handleTabClick('Ofício'));

// Botões do Modal
modalCancelButton.addEventListener('click', () => {
  confirmModal.classList.remove('visible');
  // Reseta o modal caso ele tenha dado erro
  modalConfirmButton.style.display = 'block';
  modalCancelButton.textContent = 'Não';
});

modalConfirmButton.addEventListener('click', () => {
  if (pendingAction) {
    pendingAction();
  }
  // Não fecha o modal aqui, o 'executeCancel' decide quando fechar
});
