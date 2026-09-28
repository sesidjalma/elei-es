// Data limite: 01 de Outubro de 2026 às 00:00:00 (encerra dia 30/09 às 23:59:59)
const DATA_LIMITE = new Date('2026-10-01T00:00:00');

// Função para verificar se as inscrições ainda estão abertas
function verificarPrazo() {
  const agora = new Date();

  if (agora >= DATA_LIMITE) {
    const formContainer = document.querySelector('.form-container');
    
    if (formContainer) {
      // Substitui todo o formulário por uma mensagem de encerramento
      formContainer.innerHTML = `
        <div class="form-header-card" style="border-top-color: #dc2626; text-align: center;">
          <h1 style="color: #dc2626;">Inscrições Encerradas! 🔒</h1>
          <p style="margin-top: 1rem; font-size: 1.05rem;">
            O prazo para envio de candidaturas para as <strong>Eleições CRI 2026</strong> se encerrou no dia <strong>30/09/2026 às 23:59</strong>.
          </p>
          <p style="margin-top: 0.8rem; color: #64748b;">
            Agradecemos a todos os candidatos participantes!
          </p>
        </div>
      `;
    }
    return false;
  }
  return true;
}

// Executa a verificação assim que a página carrega
document.addEventListener('DOMContentLoaded', () => {
  verificarPrazo();
});

// Elementos do DOM (ATUALIZADOS COM OS BOTÕES DE REMOVER)
const fileInput = document.getElementById('video-file');
const fileMsg = document.getElementById('file-msg');
const videoPreview = document.getElementById('video-preview');
const videoPreviewWrapper = document.getElementById('video-preview-wrapper');
const removeVideoBtn = document.getElementById('remove-video-btn');
const removePreviewBtn = document.getElementById('remove-preview-btn');
const form = document.getElementById('candidatura-form');

// URL GERADA NA IMPLANTAÇÃO DO GOOGLE APPS SCRIPT
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzGt5CZM5_qGSp8eG2zCUjmfgkrpjwnc7OH-ZNHoMbrEXOX5NpjY88CjZoT6-pLg8W1/exec';

// Função para limpar e remover o vídeo selecionado
function removerVideo() {
  if (fileInput) fileInput.value = ''; // Reseta o input de arquivo
  if (fileMsg) fileMsg.textContent = 'Clique ou arraste seu arquivo de vídeo aqui (MP4, MOV)';
  if (videoPreview) videoPreview.src = '';
  if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'none';
  if (removeVideoBtn) removeVideoBtn.style.display = 'none';
}

// Evento ao selecionar um arquivo
if (fileInput) {
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      fileMsg.textContent = `Arquivo selecionado: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
      const fileURL = URL.createObjectURL(file);
      videoPreview.src = fileURL;
      if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'block';
      if (removeVideoBtn) removeVideoBtn.style.display = 'flex';
    } else {
      removerVideo();
    }
  });
}

// Eventos de clique nos botões "X"
if (removeVideoBtn) {
  removeVideoBtn.addEventListener('click', function(e) {
    e.stopPropagation(); // Evita reabrir o seletor de arquivos
    removerVideo();
  });
}

if (removePreviewBtn) {
  removePreviewBtn.addEventListener('click', function(e) {
    removerVideo();
  });
}

// Função auxiliar para converter arquivo em Base64
const fileToBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

// Lógica de envio do formulário
if (form) {
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Re-verifica o prazo no exato momento da tentativa de envio
    if (!verificarPrazo()) {
      alert('O prazo de inscrições expirou!');
      return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    const file = fileInput.files[0];

    if (!file) {
      alert('Por favor, selecione um vídeo antes de enviar.');
      return;
    }

    // Feedback visual de carregamento
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando vídeo para o Drive... Aguarde.';

    try {
      const base64Video = await fileToBase64(file);

      const payload = {
        fullname: document.getElementById('fullname').value,
        series: document.getElementById('series').value,
        role: document.getElementById('role').value,
        videoName: file.name,
        mimeType: file.type,
        videoData: base64Video
      };

      // Envia os dados para o Google Apps Script
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Candidatura enviada e vídeo salvo com sucesso no Drive!');
        form.reset();
        removerVideo(); // Reseta o estado visual do vídeo enviado
      } else {
        alert('Erro ao enviar para o Drive: ' + result.message);
      }

    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao tentar enviar o formulário.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Candidatura';
    }
  });
}
