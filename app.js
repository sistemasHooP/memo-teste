// ========================================================================
// VARIÁVEIS GLOBAIS
// ========================================================================

// !!! IMPORTANTE !!!
// ATUALIZADO COM A SUA ÚLTIMA E NOVA URL DA API
const API_URL = "https://script.google.com/macros/s/AKfycby1s6YtiJ8nfY9M7-liZbuPMqo2mOfSbnOW4FFRc39Mw9YzHON0XLIljhjZkEM9D3-wXQ/exec"; 

// Armazena o nome do usuário logado
let currentUserName = '';
// NOVO: Armazena o status de admin do usuário logado
let currentUserIsAdmin = false;
// Armazena o tipo de documento selecionado (aba)
let currentDocumentType = 'Memorando';

// Seletores de Elementos da UI
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const historyScreen = document.getElementById('historyScreen');
const successScreen = document.getElementById('successScreen');
// NOVO: Tela de Admin
const adminScreen = document.getElementById('adminScreen');

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
// NOVO: Botão de Admin
const adminButton = document.getElementById('adminButton');

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
// NOVOS SELETORES (PAINEL DE ADMIN)
// ========================================================================
const adminSpinner = document.getElementById('adminSpinner');
const adminError = document.getElementById('adminError');
const adminContent = document.getElementById('adminContent');
const adminBackButton = document.getElementById('adminBackButton');

// Seção de Usuários
const adminUserError = document.getElementById('adminUserError');
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserLevelInput = document.getElementById('newUserLevelInput');
const addUserButton = document.getElementById('addUserButton');
const userList = document.getElementById('userList');

// Seção de Configurações
const adminSettingsError = document.getElementById('adminSettingsError');
const saveSettingsButton = document.getElementById('saveSettingsButton');
// Formulário Memo
const memoSettingsForm = document.getElementById('memoSettingsForm');
const memoStart = document.getElementById('memoStart');
const memoEnd = document.getElementById('memoEnd');
const memoNext = document.getElementById('memoNext');
const memoYear = document.getElementById('memoYear');
// Formulário Ofício
const oficioSettingsForm = document.getElementById('oficioSettingsForm');
const oficioStart = document.getElementById('oficioStart');
const oficioEnd = document.getElementById('oficioEnd');
const oficioNext = document.getElementById('oficioNext');
const oficioYear = document.getElementById('oficioYear');


// ========================================================================
// FUNÇÃO HELPER (AJUDA): sleep
// ========================================================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================================================
// FUNÇÃO HELPER (AJUDA): callApi
// ========================================================================
/**
  * Função central para fazer chamadas à nossa API do Google Script.
  * (Inclui lógica de retentativa automática)
  */
async function callApi(action, payload = {}) {
  const MAX_RETRIES = 3; 
  const RETRY_DELAY = 2000; 
  const url = API_URL;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: action,
          payload: payload 
        }),
      };

      const response = await fetch(url, options);
      const textResponse = await response.text();
      let data;

      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error(`Tentativa ${attempt}: Erro ao parsear JSON:`, textResponse);
        if (textResponse.includes("não pôde ser encontrado")) {
          throw new Error("Erro de API: Script não encontrado. Verifique a URL.");
        }
         if (textResponse.includes("TypeError:") || textResponse.includes("ReferenceError:")) {
          throw new Error("Erro crítico no servidor (Code.gs). Verifique os logs.");
        }
        throw new Error("Resposta inesperada do servidor.");
      }
      
      if (data.status === 'success') {
        return data.data; // SUCESSO!
      } else {
        throw new Error(data.message);
      }

    } catch (error) {
      console.warn(`Tentativa ${attempt} falhou: ${error.message}`);
      
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Falha ao conectar à API após ${MAX_RETRIES} tentativas.`);
        }
        console.log(`...esperando ${RETRY_DELAY / 1000}s para tentar de novo...`);
        await sleep(RETRY_DELAY);
      } else {
        throw error; // Propaga o erro de lógica (ex: "Usuário não encontrado")
      }
    }
  }
}

// ========================================================================
// FUNÇÕES DA APLICAÇÃO (PRINCIPAIS)
// ========================================================================

/**
  * Carrega os detalhes do app (logo e nome) assim que a página abre.
  */
async function loadAppDetails() {
  try {
    const data = await callApi('getAppDetails');
    appName.textContent = data.appName;
    appLogo.src = data.logoUrl;
    appHeader.classList.remove('opacity-0');
  } catch (error) {
    appName.textContent = "Erro ao Carregar";
    appHeader.classList.remove('opacity-0');
    console.error(error);
    loginError.textContent = error.message;
  }
}

/**
  * Troca qual tela está visível.
  */
function showScreen(screenId) {
  loginScreen.style.display = (screenId === 'login') ? 'block' : 'none';
  mainScreen.style.display = (screenId === 'main') ? 'block' : 'none';
  historyScreen.style.display = (screenId === 'history') ? 'block' : 'none';
  successScreen.style.display = (screenId === 'success') ? 'block' : 'none';
  adminScreen.style.display = (screenId === 'admin') ? 'block' : 'none';
  
  // Limpa erros anteriores
  loginError.textContent = '';
  requestError.textContent = '';
  adminError.textContent = '';
  adminUserError.textContent = '';
  adminSettingsError.textContent = '';
}

/**
  * ATUALIZADO: Lida com a tentativa de login.
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
    // ATUALIZADO: checkUser agora retorna um objeto
    const loginData = await callApi('checkUser', { name: name });
    
    if (loginData.userExists) {
      currentUserName = name;
      currentUserIsAdmin = loginData.isAdmin; // Armazena o status de admin
      userNameSpan.textContent = name.split(' ')[0]; 
      showScreen('main');
      
      // NOVO: Mostra o botão de Admin se o usuário for Admin
      if (currentUserIsAdmin) {
        adminButton.style.display = 'block';
      } else {
        adminButton.style.display = 'none';
      }
      
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
  adminButton.style.display = 'none'; // Esconde o botão de admin durante a requisição
  requestSpinner.style.display = 'block';
  requestError.textContent = '';
  try {
    const payload = {
      userName: currentUserName,
      quantity: parseInt(quantity, 10),
      purpose: purpose,
      tipo: currentDocumentType 
    };
    const generated = await callApi('requestNumbers', payload);
    onRequestSuccess(generated);
  } catch (error) {
    requestError.textContent = `Erro: ${error.message}`;
  } finally {
    requestButton.style.display = 'block';
    historyButton.style.display = 'block';
    if (currentUserIsAdmin) adminButton.style.display = 'block'; // Mostra o botão de admin novamente
    requestSpinner.style.display = 'none';
  }
}

/**
  * Exibe a tela de sucesso com os números gerados.
  */
function onRequestSuccess(numbers) {
  generatedNumbers.innerHTML = ''; 
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
    const history = await callApi('getUserHistory', { name: currentUserName });
    if (history.length === 0) {
      historyContent.innerHTML = '<p class="text-center text-gray-400">Você ainda não possui registros.</p>';
    } else {
      history.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item bg-gray-900/50 p-3 rounded-lg border border-gray-700/50';
        itemDiv.id = `item-${item.rowNumber}`; 
        const isCanceled = item.status === 'Cancelado';
        if (isCanceled) {
          itemDiv.classList.add('canceled');
        }
        let date = 'Data inválida';
        try {
          date = new Date(item.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); 
        } catch(e) {}
        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex justify-between items-start';
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-shrink-0 mr-4';
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
          const cancelButton = document.createElement('button');
          cancelButton.className = 'btn-cancel flex-shrink-0';
          cancelButton.title = 'Cancelar este item';
          cancelButton.innerHTML = '&times;'; 
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
  pendingAction = () => executeCancel(rowNumber);
  modalTitle.textContent = 'Confirmar Cancelamento';
  modalMessage.textContent = `Tem certeza de que deseja cancelar o item Nº ${memoNumber}? Esta ação não pode ser desfeita.`;
  modalConfirmButton.className = 'btn-danger w-full py-3 rounded-lg text-white font-semibold';
  modalConfirmButton.textContent = 'Sim, Cancelar';
  modalConfirmButton.style.display = 'block';
  modalCancelButton.textContent = 'Não';
  confirmModal.classList.add('visible');
}

/**
  * Executa a ação de cancelar (chamada pela API).
  */
async function executeCancel(rowNumber) {
  modalConfirmButton.innerHTML = '<div class="spinner mx-auto" style="width: 24px; height: 24px; border-width: 2px;"></div>';
  modalConfirmButton.disabled = true;
  modalCancelButton.disabled = true;
  try {
    const payload = { rowNumber: rowNumber, userName: currentUserName };
    await callApi('cancelDocument', payload);
    const itemDiv = document.getElementById(`item-${rowNumber}`);
    if (itemDiv) {
      itemDiv.classList.add('canceled');
      const btn = itemDiv.querySelector('.btn-cancel');
      if (btn) btn.remove();
      const infoDiv = itemDiv.querySelector('.flex-shrink-0')?.parentNode || itemDiv.querySelector('div');
      const statusP = document.createElement('p');
      statusP.className = 'text-xs text-red-400 font-semibold mt-2';
      statusP.textContent = 'CANCELADO';
      infoDiv.appendChild(statusP);
    }
    confirmModal.classList.remove('visible');
  } catch (error) {
    modalTitle.textContent = 'Erro ao Cancelar';
    modalMessage.textContent = error.message;
    modalConfirmButton.style.display = 'none';
    modalCancelButton.textContent = 'Fechar';
  } finally {
    modalConfirmButton.innerHTML = 'Sim, Cancelar';
    modalConfirmButton.disabled = false;
    modalCancelButton.disabled = false;
  }
}

/**
  * Controla os botões +/- do seletor de quantidade.
  */
function adjustQuantity(amount) {
  let currentValue = parseInt(quantityInput.value, 10);
  currentValue += amount;
  if (currentValue < 1) {
    currentValue = 1; 
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
// NOVAS FUNÇÕES (PAINEL DE ADMIN)
// ========================================================================

/**
 * Busca os dados do servidor e preenche o painel de admin.
 */
async function openAdminPanel() {
  showScreen('admin');
  adminContent.style.display = 'none';
  adminSpinner.style.display = 'block';
  adminError.textContent = '';
  
  try {
    const data = await callApi('getAdminDashboardData', { userName: currentUserName });
    
    // 1. Preencher Configurações
    const { memo, oficio } = data.settings;
    memoStart.value = `Início: ${memo.start}`;
    memoEnd.value = memo.end;
    memoNext.value = memo.next;
    memoYear.value = `Ano: ${memo.year}`;
    
    oficioStart.value = `Início: ${oficio.start}`;
    oficioEnd.value = oficio.end;
    oficioNext.value = oficio.next;
    oficioYear.value = `Ano: ${oficio.year}`;
    
    // 2. Preencher Lista de Usuários
    userList.innerHTML = ''; // Limpa a lista antiga
    data.users.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'user-list-item';
      
      const userInfo = document.createElement('div');
      userInfo.innerHTML = `
        <span class="font-semibold">${user.name}</span>
        <span class="text-sm ${user.level === 'Admin' ? 'text-blue-300' : 'text-gray-400'}">(${user.level})</span>
      `;
      userDiv.appendChild(userInfo);
      
      // Não permite deletar a si mesmo
      if (user.name.trim().toLowerCase() !== currentUserName.trim().toLowerCase()) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-user-btn';
        deleteBtn.textContent = 'Deletar';
        deleteBtn.addEventListener('click', () => {
          handleDeleteUser(user.name);
        });
        userDiv.appendChild(deleteBtn);
      }
      
      userList.appendChild(userDiv);
    });

  } catch (error) {
    adminError.textContent = `Erro ao carregar dados: ${error.message}`;
  } finally {
    adminContent.style.display = 'block';
    adminSpinner.style.display = 'none';
  }
}

/**
 * (Admin) Salva as alterações nas configurações de sequência.
 */
async function handleSaveSettings() {
  adminSettingsError.textContent = '';
  saveSettingsButton.disabled = true;
  saveSettingsButton.textContent = 'Salvando...';

  try {
    const settings = {
      memo: {
        end: parseInt(memoEnd.value, 10),
        next: parseInt(memoNext.value, 10)
      },
      oficio: {
        end: parseInt(oficioEnd.value, 10),
        next: parseInt(oficioNext.value, 10)
      }
    };
    
    // Validação simples
    if (isNaN(settings.memo.end) || isNaN(settings.memo.next) || isNaN(settings.oficio.end) || isNaN(settings.oficio.next)) {
      throw new Error('Valores de "Fim" e "Próximo" devem ser números.');
    }
    
    await callApi('updateSequenceSettings', { userName: currentUserName, settings: settings });
    
    // Sucesso
    adminSettingsError.textContent = 'Configurações salvas!';
    adminSettingsError.className = 'text-green-400 text-center text-sm mb-2';

  } catch (error) {
    adminSettingsError.textContent = error.message;
    adminSettingsError.className = 'text-red-400 text-center text-sm mb-2';
  } finally {
    saveSettingsButton.disabled = false;
    saveSettingsButton.textContent = 'Salvar Configurações';
  }
}

/**
 * (Admin) Adiciona um novo usuário.
 */
async function handleAddNewUser() {
  adminUserError.textContent = '';
  const newUserName = newUserNameInput.value;
  const newUserLevel = newUserLevelInput.value;
  
  if (!newUserName) {
    adminUserError.textContent = 'Nome do novo usuário não pode estar vazio.';
    return;
  }
  
  addUserButton.disabled = true;
  addUserButton.textContent = 'Adicionando...';
  
  try {
    await callApi('addNewUser', { 
      userName: currentUserName,
      newUserName: newUserName,
      newUserLevel: newUserLevel
    });
    
    // Sucesso! Limpa o campo e recarrega o painel
    newUserNameInput.value = '';
    await openAdminPanel(); // Recarrega os dados para mostrar o novo usuário

  } catch (error) {
    adminUserError.textContent = error.message; // Ex: "Este usuário já existe."
  } finally {
    addUserButton.disabled = false;
    addUserButton.textContent = 'Adicionar Usuário';
  }
}

/**
 * (Admin) Abre o modal de confirmação para deletar um usuário.
 */
function handleDeleteUser(userToDelete) {
  pendingAction = () => executeDeleteUser(userToDelete);
  
  modalTitle.textContent = 'Confirmar Deleção';
  modalMessage.textContent = `Tem certeza de que deseja deletar o usuário "${userToDelete}"? Esta ação não pode ser desfeita.`;
  modalConfirmButton.className = 'btn-danger w-full py-3 rounded-lg text-white font-semibold';
  modalConfirmButton.textContent = 'Sim, Deletar';
  modalConfirmButton.style.display = 'block';
  modalCancelButton.textContent = 'Não';
  
  confirmModal.classList.add('visible');
}

/**
 * (Admin) Executa a deleção do usuário (chamada pela API).
 */
async function executeDeleteUser(userToDelete) {
  modalConfirmButton.innerHTML = '<div class="spinner mx-auto" style="width: 24px; height: 24px; border-width: 2px;"></div>';
  modalConfirmButton.disabled = true;
  modalCancelButton.disabled = true;
  
  try {
    await callApi('deleteUser', { 
      userName: currentUserName,
      userToDelete: userToDelete
    });
    
    // Sucesso! Fecha o modal e recarrega o painel
    confirmModal.classList.remove('visible');
    await openAdminPanel(); // Recarrega os dados

  } catch (error) {
    modalTitle.textContent = 'Erro ao Deletar';
    modalMessage.textContent = error.message;
    modalConfirmButton.style.display = 'none';
    modalCancelButton.textContent = 'Fechar';
  } finally {
    modalConfirmButton.innerHTML = 'Sim, Deletar';
    modalConfirmButton.disabled = false;
    modalCancelButton.disabled = false;
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
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

// Botões da Tela Principal
requestButton.addEventListener('click', handleRequest);
historyButton.addEventListener('click', showHistory);
adminButton.addEventListener('click', openAdminPanel); // NOVO

// Botão Voltar (do Histórico)
backButton.addEventListener('click', () => {
  showScreen('main');
});

// Botão Solicitar Mais (da tela de Sucesso)
newRequestButton.addEventListener('click', () => {
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
  pendingAction = null; // Limpa a ação pendente
  // Reseta o modal
  modalConfirmButton.style.display = 'block';
  modalCancelButton.textContent = 'Não';
});
modalConfirmButton.addEventListener('click', () => {
  if (pendingAction) {
    pendingAction();
    pendingAction = null; // Limpa a ação após executá-la
  }
});

// NOVOS: Botões do Painel de Admin
adminBackButton.addEventListener('click', () => {
  showScreen('main');
});
saveSettingsButton.addEventListener('click', handleSaveSettings);
addUserButton.addEventListener('click', handleAddNewUser);
