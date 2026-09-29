const DATA_LIMITE = new Date('2026-10-01T00:00:00');

function verificarPrazo() {
  const agora = new Date();
  if (agora >= DATA_LIMITE) {
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.innerHTML = `
        <div class="form-header-card" style="border-top-color: #dc2626; text-align: center;">
          <h1 style="color: #dc2626;">Inscrições Encerradas! 🔒</h1>
          <p style="margin-top: 1rem; font-size: 1.05rem;">
            O prazo para envio de candidaturas para as <strong>Eleições CRI 2026</strong> se encerrou no dia <strong>30/09/2026 às 23:59</strong>.
          </p>
        </div>
      `;
    }
    return false;
  }
  return true;
}

let fileInput, fileMsg, videoPreview, videoPreviewWrapper, removeVideoBtn, removePreviewBtn, form;

document.addEventListener('DOMContentLoaded', () => {
  if (!verificarPrazo()) return;

  fileInput = document.getElementById('video-file');
  fileMsg = document.getElementById('file-msg');
  videoPreview = document.getElementById('video-preview');
  videoPreviewWrapper = document.getElementById('video-preview-wrapper');
  removeVideoBtn = document.getElementById('remove-video-btn');
  removePreviewBtn = document.getElementById('remove-preview-btn');
  form = document.getElementById('candidatura-form');

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzGt5CZM5_qGSp8eG2zCUjmfgkrpjwnc7OH-ZNHoMbrEXOX5NpjY88CjZoT6-pLg8W1/exec';

  function removerVideo() {
    if (fileInput) fileInput.value = '';
    if (fileMsg) fileMsg.textContent = 'Clique ou arraste seu arquivo de vídeo aqui (MP4, MOV)';
    if (videoPreview) videoPreview.src = '';
    if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'none';
    if (removeVideoBtn) removeVideoBtn.style.display = 'none';
  }

  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        if (fileMsg) fileMsg.textContent = `Arquivo selecionado: ${file.name} (${sizeMB} MB)`;
        const fileURL = URL.createObjectURL(file);
        if (videoPreview) videoPreview.src = fileURL;
        if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'block';
        if (removeVideoBtn) removeVideoBtn.style.display = 'flex';
      } else {
        removerVideo();
      }
    });
  }

  if (removeVideoBtn) removeVideoBtn.addEventListener('click', (e) => { e.stopPropagation(); removerVideo(); });
  if (removePreviewBtn) removePreviewBtn.addEventListener('click', removerVideo);

  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!verificarPrazo()) return;

      const submitBtn = form.querySelector('.submit-btn');
      const file = fileInput ? fileInput.files[0] : null;

      if (!file) {
        alert('Por favor, selecione um vídeo antes de enviar.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'A preparar envio direto...';

      try {
        const fullname = document.getElementById('fullname').value;
        const series = document.getElementById('series').value;
        const role = document.getElementById('role').value;

        // 1. Solicita a URL de envio direto
        const initRes = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'getUploadUrl',
            fullname: fullname,
            role: role,
            videoName: file.name,
            mimeType: file.type || 'video/mp4'
          })
        });

        const initData = await initRes.json();
        if (initData.status === 'error') throw new Error(initData.message);

        const uploadUrl = initData.uploadUrl;

        // 2. Envia o vídeo em blocos (Chunks de 5MB)
        const chunkSize = 5 * 1024 * 1024;
        let start = 0;
        let driveFileId = null;

        while (start < file.size) {
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const percent = Math.round((start / file.size) * 100);

          submitBtn.textContent = `A enviar vídeo: ${percent}%`;

          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': `bytes ${start}-${end - 1}/${file.size}`
            },
            body: chunk
          });

          if (response.status === 200 || response.status === 201) {
            const resData = await response.json();
            driveFileId = resData.id;
            break;
          } else if (response.status !== 308) {
            throw new Error('Erro ao transmitir o vídeo. Status: ' + response.status);
          }

          start = end;
        }

        submitBtn.textContent = 'A finalizar registo...';

        // 3. Registar o envio e disparar o e-mail
        const finalRes = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'finalizeUpload',
            fileId: driveFileId,
            fullname: fullname,
            series: series,
            role: role
          })
        });

        const finalData = await finalRes.json();

        if (finalData.status === 'success') {
          alert('Candidatura e vídeo enviados com sucesso!');
          form.reset();
          removerVideo();
        } else {
          throw new Error(finalData.message);
        }

      } catch (err) {
        console.error(err);
        alert('Erro no envio: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Candidatura';
      }
    });
  }
});
