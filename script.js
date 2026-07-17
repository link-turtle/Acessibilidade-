let recognition;
let fullText = ""; 
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnSave = document.getElementById('btn-save');
const transcriptionBox = document.getElementById('transcription-box');
const summaryBox = document.getElementById('summary-box');

// 1. CONFIGURAÇÃO DO RECONHECIMENTO DE VOZ
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
                speakDiscreetly(event.results[i][0].transcript);
                vibrateDiscrete();
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if(finalTranscript !== "") {
            fullText += finalTranscript + ". ";
            btnSave.disabled = false; // Ativa o botão de salvar ao receber conteúdo
        }
        transcriptionBox.innerHTML = fullText + '<span style="opacity: 0.5">' + interimTranscript + '</span>';
    };

    recognition.onerror = (event) => {
        console.error(event.error);
    };

    btnStart.addEventListener('click', () => {
        recognition.start();
        btnStart.disabled = true;
        btnStop.disabled = false;
        transcriptionBox.innerHTML = "Ouvindo o professor...";
        vibrateDiscrete();
    });

    btnStop.addEventListener('click', () => {
        recognition.stop();
        btnStart.disabled = false;
        btnStop.disabled = true;
        vibrateDiscrete();
    });
} else {
    transcriptionBox.innerHTML = "O navegador não suporta reconhecimento de voz local.";
    btnStart.disabled = true;
}

// 2. LEITURA EM ÁUDIO (Text-to-Speech)
function speakDiscreetly(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1; 
        window.speechSynthesis.speak(utterance);
    }
}

// 3. VIBRAÇÃO DISCRETA
function vibrateDiscrete() {
    if (navigator.vibrate) {
        navigator.vibrate(80);
    }
}

function testVibration() {
    vibrateDiscrete();
}

// 4. ACESSIBILIDADE VISUAL
function toggleZoom() {
    document.body.classList.toggle('large-text');
    vibrateDiscrete();
}

function toggleContrast() {
    document.body.classList.toggle('high-contrast');
    vibrateDiscrete();
}

// 5. CRIAÇÃO DE RESUMOS SIMPLIFICADOS
function generateSummary() {
    vibrateDiscrete();
    if (fullText.trim() === "") {
        summaryBox.innerHTML = "Nenhum conteúdo capitado para estruturar um resumo.";
        return;
    }

    const frases = fullText.split('. ');
    let resumoHtml = "<strong>Pontos principais anotados:</strong><ul>";
    let topicos = frases.filter(f => f.length > 15).slice(0, 5); 

    if(topicos.length === 0) {
        topicos = ["Conteúdo curto capturado. Revise a transcrição completa."];
    }

    topicos.forEach(topico => {
        resumoHtml += `<li>${topico}.</li>`;
    });
    resumoHtml += "</ul>";

    summaryBox.innerHTML = resumoHtml;
    speakDiscreetly("Resumo gerado.");
}

// 6. GERENCIAMENTO DE ABAS
function switchTab(tabName) {
    vibrateDiscrete();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');

    if (tabName === 'history') {
        renderHistory();
    }
}

// 7. ARMAZENAMENTO LOCAL (Salvar no Navegador)
function saveCurrentClass() {
    vibrateDiscrete();
    if (!fullText.trim()) return;

    const currentSummary = summaryBox.innerHTML;
    const newClass = {
        id: Date.now(),
        date: new Date().toLocaleString('pt-BR'),
        transcript: fullText,
        summary: currentSummary.includes('Anotados') ? currentSummary : "<p>Sem notas geradas.</p>"
    };

    let history = JSON.parse(localStorage.getItem('savedClasses')) || [];
    history.unshift(newClass);
    localStorage.setItem('savedClasses', JSON.stringify(history));

    alert("Aula salva no histórico com sucesso!");
}

// 8. RENDERIZAR HISTÓRICO
function renderHistory() {
    const historyList = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('savedClasses')) || [];

    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history-msg">Nenhuma aula salva até o momento.</p>';
        return;
    }

    historyList.innerHTML = "";
    history.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'history-item';
        itemElement.innerHTML = `
            <div class="history-item-header">
                <div>
                    <span class="history-item-title">Aula Gravada</span>
                    <div class="history-item-date">${item.date}</div>
                </div>
                <button class="btn btn-delete" onclick="deleteClass(${item.id})">Excluir</button>
            </div>
            <details style="margin-bottom: 10px; cursor: pointer;">
                <summary style="font-weight: 600; color: var(--primary-color);">Ver Transcrição Completa</summary>
                <div class="text-box" style="min-height: auto; margin-top: 5px;">${item.transcript}</div>
            </details>
            <details style="cursor: pointer;">
                <summary style="font-weight: 600; color: var(--success-color);">Ver Anotações/Resumo</summary>
                <div style="margin-top: 10px;">${item.summary}</div>
            </details>
        `;
        historyList.appendChild(itemElement);
    });
}

// 9. EXCLUIR HISTÓRICO
function deleteClass(id) {
    vibrateDiscrete();
    if(confirm("Apagar o registro desta aula?")) {
        let history = JSON.parse(localStorage.getItem('savedClasses')) || [];
        history = history.filter(item => item.id !== id);
        localStorage.setItem('savedClasses', JSON.stringify(history));
        renderHistory();
    }
}