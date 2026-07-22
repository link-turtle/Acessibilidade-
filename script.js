// IMPORTAÇÃO DOS MÓDULOS DO FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCCiVxu-AyMlEPuPfIjLFpoJuSYqZWKpu0",
  authDomain: "assistente-aula-acessivel.firebaseapp.com",
  databaseURL: "https://assistente-aula-acessivel-default-rtdb.firebaseio.com",
  projectId: "assistente-aula-acessivel",
  storageBucket: "assistente-aula-acessivel.firebasestorage.app",
  messagingSenderId: "778747702655",
  appId: "1:778747702655:web:5e1219d36bf0b3b52c3e4a",
  measurementId: "G-KB30LPR10P"
};

// INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let recognition;
let fullText = ""; 
let isSpeaking = false; // Controle para evitar loop de áudio

// ELEMENTOS DA TELA
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnSave = document.getElementById('btn-save');
const transcriptionBox = document.getElementById('transcription-box');
const summaryBox = document.getElementById('summary-box');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');

// --- NOTIFICAÇÃO PERSONALIZADA (TOAST) ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast) return;

    toastMessage.textContent = message;

    if (type === 'error') {
        toast.classList.add('toast-error');
        toastIcon.textContent = '⚠️';
    } else {
        toast.classList.remove('toast-error');
        toastIcon.textContent = '✅';
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// --- AUTENTICAÇÃO (LOGIN / LOGOUT) ---
btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error("Erro no login:", err);
        showToast("Erro ao realizar o login.", "error");
    });
});

btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        showToast("Você saiu da sua conta.");
    });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        btnLogin.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = `Olá, ${user.displayName.split(' ')[0]}`;
        renderHistory();
    } else {
        currentUser = null;
        btnLogin.style.display = 'inline-block';
        userInfo.style.display = 'none';
        document.getElementById('history-list').innerHTML = '<p class="empty-history-msg">Faça login para ver suas aulas salvas.</p>';
    }
});

// --- LIMPAR TRANSCRIÇÃO E RESUMO ---
window.clearTranscription = function() {
    vibrateDiscrete();
    fullText = "";
    transcriptionBox.innerHTML = "O texto da aula aparecerá aqui assim que o professor começar a falar...";
    summaryBox.innerHTML = "O resumo gerado com base no que foi falado aparecerá aqui.";
    btnSave.disabled = true;
};

// --- FUNÇÃO PARA LER EM VOZ ALTA SEM CRIAR LOOP ---
function speakDiscreetly(text) {
    if ('speechSynthesis' in window && text.trim() !== "") {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            if (recognition) {
                try { recognition.stop(); } catch(e) {}
            }
        };

        utterance.onend = () => {
            isSpeaking = false;
            if (recognition && btnStart.disabled) {
                try { recognition.start(); } catch(e) {}
            }
        };

        utterance.onerror = () => {
            isSpeaking = false;
            if (recognition && btnStart.disabled) {
                try { recognition.start(); } catch(e) {}
            }
        };

        window.speechSynthesis.speak(utterance);
    }
}

// --- RECONHECIMENTO DE VOZ ---
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                fullText += transcriptChunk + " ";
                btnSave.disabled = false;
                vibrateDiscrete();
            } else {
                interimTranscript += transcriptChunk;
            }
        }

        transcriptionBox.innerHTML = fullText + '<span style="opacity: 0.5">' + interimTranscript + '</span>';
    };

    recognition.onerror = (event) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        if (event.error === 'not-allowed') {
            showToast("Permissão de microfone negada no navegador.", "error");
        }
    };

    recognition.onend = () => {
        // Se a gravação estiver ativa e o leitor não estiver falando, reconecta o microfone
        if (btnStart.disabled && !isSpeaking) {
            try { recognition.start(); } catch(e) {}
        }
    };

    btnStart.addEventListener('click', () => {
        fullText = "";
        isSpeaking = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        try { 
            recognition.start(); 
        } catch(e) {
            console.error("Erro ao iniciar:", e);
        }
        btnStart.disabled = true;
        btnStop.disabled = false;
        transcriptionBox.innerHTML = "Ouvindo o professor...";
        vibrateDiscrete();
    });

    btnStop.addEventListener('click', () => {
        isSpeaking = false;
        try { recognition.stop(); } catch(e) {}
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        btnStart.disabled = false;
        btnStop.disabled = true;
        vibrateDiscrete();
    });
} else {
    transcriptionBox.innerHTML = "O navegador não suporta reconhecimento de voz local.";
    btnStart.disabled = true;
}

// --- ACESSIBILIDADE & UTILITÁRIOS ---
function vibrateDiscrete() {
    if (navigator.vibrate) navigator.vibrate(80);
}

window.testVibration = () => vibrateDiscrete();

window.toggleZoom = () => { 
    document.body.classList.toggle('large-text'); 
    vibrateDiscrete(); 

    if (document.body.classList.contains('large-text')) {
        showToast("Tamanho do texto aumentado!");
    } else {
        showToast("Tamanho do texto restaurado.");
    }
};

window.toggleContrast = () => { document.body.classList.toggle('high-contrast'); vibrateDiscrete(); };

window.generateSummary = function() {
    vibrateDiscrete();
    if (fullText.trim() === "") {
        summaryBox.innerHTML = "Nada foi capturado, para o resumo.";
        return;
    }
    const frases = fullText.split('. ');
    let resumoHtml = "<strong>Pontos principais anotados:</strong><ul>";
    let topicos = frases.filter(f => f.length > 15).slice(0, 5); 
    if(topicos.length === 0) topicos = ["Conteúdo curto capturado. Revise a transcrição completa."];
    topicos.forEach(topico => { resumoHtml += `<li>${topico}.</li>`; });
    resumoHtml += "</ul>";
    summaryBox.innerHTML = resumoHtml;
    speakDiscreetly("Resumo gerado.");
};

window.switchTab = function(tabName) {
    vibrateDiscrete();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
    if (tabName === 'history') renderHistory();
};

// --- ARMAZENAMENTO NO FIREBASE (BANCO DE DADOS PRIVADO) ---
window.saveCurrentClass = async function() {
    vibrateDiscrete();
    if (!currentUser) {
        showToast("Faça login para puder salvar a aula.", "error");
        return;
    }
    if (!fullText.trim()) return;

    const currentSummaryHtml = summaryBox.innerHTML;
    const isDefaultText = currentSummaryHtml.includes("O resumo gerado com base no que foi falado aparecerá aqui");
    const summaryToSave = (isDefaultText || !currentSummaryHtml.trim()) 
        ? "<p>Sem notas geradas.</p>" 
        : currentSummaryHtml;

    try {
        await addDoc(collection(db, "users", currentUser.uid, "classes"), {
            date: new Date().toLocaleString('pt-BR'),
            createdAt: new Date(),
            transcript: fullText,
            summary: summaryToSave
        });

        showToast("Aula salva com sucesso!");

        clearTranscription();
        speakDiscreetly("Aula salva.");

    } catch (error) {
        console.error("Erro ao salvar aula:", error);
        showToast("Erro ao salvar a aula no banco de dados.", "error");
    }
};

// --- FUNÇÃO PARA REFALAR A AULA DO HISTÓRICO ---
window.speakClass = function(encTranscript, encSummary) {
    vibrateDiscrete();
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    const transcript = decodeURIComponent(encTranscript);
    const summary = decodeURIComponent(encSummary).replace(/<[^>]*>?/gm, '');

    const fullSpeech = `Reproduzindo aula salva. Transcrição: ${transcript}. Resumo: ${summary}`;

    speakDiscreetly(fullSpeech);
};

async function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!currentUser) {
        historyList.innerHTML = '<p class="empty-history-msg">Faça login para ver suas aulas salvas.</p>';
        return;
    }

    try {
        const q = query(collection(db, "users", currentUser.uid, "classes"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historyList.innerHTML = '<p class="empty-history-msg">Nenhuma aula salva na sua conta até o momento.</p>';
            return;
        }

        historyList.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';
            itemElement.innerHTML = `
                <div class="history-item-header">
                    <div>
                        <span class="history-item-title">Aula Gravada</span>
                        <div class="history-item-date">${item.date}</div>
                    </div>
                    <div class="history-actions" style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="speakClass(\`${encodeURIComponent(item.transcript)}\`, \`${encodeURIComponent(item.summary)}\`)" style="padding: 5px 10px; font-size: 0.85rem;">🔊 Ouvir Aula</button>
                        <button class="btn btn-share" onclick="shareClass('${id}', \`${encodeURIComponent(item.transcript)}\`, \`${encodeURIComponent(item.summary)}\`, '${item.date}')" style="padding: 5px 10px; font-size: 0.85rem;">Compartilhar</button>
                        <button class="btn btn-delete" onclick="deleteClass('${id}')" style="padding: 5px 10px; font-size: 0.85rem;">Excluir</button>
                    </div>
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
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    }
}

window.shareClass = function(id, encTranscript, encSummary, date) {
    vibrateDiscrete();
    const transcript = decodeURIComponent(encTranscript);
    const summary = decodeURIComponent(encSummary).replace(/<[^>]*>?/gm, '');
    const shareContent = `📌 *Aula Gravada em ${date}*\n\n📝 *Transcrição:* \n${transcript}\n\n💡 *Resumo:* \n${summary}`;

    if (navigator.share) {
        navigator.share({ title: `Aula Gravada - ${date}`, text: shareContent })
            .catch(err => console.log("Compartilhamento cancelado.", err));
    } else {
        navigator.clipboard.writeText(shareContent);
        showToast("Conteúdo copiado para a área de transferência!");
    }
};

window.deleteClass = async function(id) {
    vibrateDiscrete();
    if(confirm("Apagar o registro desta aula?")) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "classes", id));
            showToast("Aula excluída.");
            renderHistory();
        } catch (error) {
            console.error("Erro ao apagar:", error);
            showToast("Erro ao excluir aula.", "error");
        }
    }
};
