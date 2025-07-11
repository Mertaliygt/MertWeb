// Firebase yapılandırma objeniz
const firebaseConfig = {
    apiKey: "AIzaSyAi9VQeCdlFfiF-LSiOKtqrsFUKKhUbSUM",
    authDomain: "mertweb-ff6d4.firebaseapp.com",
    projectId: "mertweb-ff6d4",
    storageBucket: "mertweb-ff6d4.firebasestorage.app",
    messagingSenderId: "879769246670",
    appId: "1:879769246670:web:28eca71c4fb188ae8f699f",
    measurementId: "G-J4JFJCVPJ1"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore instance'ını al
const db = firebase.firestore();

// Global değişkenler
let currentUser = null; // Giriş yapan kullanıcı
let currentRecipientId = null; // Mesaj gönderilecek alıcı ID'si

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const authContainer = document.querySelector('.auth-container');
    const chatContainer = document.querySelector('.chat-container');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesDisplay = document.getElementById('messagesDisplay'); // Mesajların gösterildiği div
    const userListElement = document.getElementById('userList'); // Kullanıcı listesi <ul>
    const chatRecipientName = document.getElementById('chatRecipientName'); // Sohbet başlığı

    // --- Giriş İşlemleri ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Formun varsayılan gönderilme davranışını engelle

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        // Geçici doğrulama: Kullanıcı adı "admin" ve şifre "12345" ise
        if (username === 'admin' && password === '12345') {
            currentUser = { id: 'admin', name: 'Admin' }; // Giriş yapan kullanıcıyı ayarla
            authContainer.style.display = 'none'; // Giriş ekranını gizle
            chatContainer.style.display = 'flex'; // Mesajlaşma ekranını göster
            console.log('Giriş başarılı!', currentUser);

            // Kullanıcı listesini yükle ve dinlemeye başla
            loadUsers();

        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
            console.log('Giriş başarısız.');
        }
    });

    // --- Kullanıcı Listesini Yükleme (Firestore'dan) ---
    async function loadUsers() {
        // Şu an için örnek kullanıcıları manuel olarak ekliyoruz.
        // Gerçek uygulamada, bir "users" koleksiyonundan çekerdiniz.
        const users = [
            { id: 'admin', name: 'Admin (Ben)' }, // Kendi kullanıcı ID'niz
            { id: 'user1', name: 'Test Kullanıcı 1' },
            { id: 'user2', name: 'Test Kullanıcı 2' },
            { id: 'user3', name: 'Test Kullanıcı 3' }
        ];

        userListElement.innerHTML = ''; // Mevcut listeyi temizle

        users.forEach(user => {
            // Sadece diğer kullanıcıları listele
            if (user.id !== currentUser.id) { 
                const li = document.createElement('li');
                li.textContent = user.name;
                li.dataset.id = user.id; // Kullanıcı ID'sini data-id olarak sakla
                li.addEventListener('click', () => selectRecipient(user));
                userListElement.appendChild(li);
            }
        });
    }

    // --- Alıcı Seçme İşlemi ---
    function selectRecipient(recipient) {
        currentRecipientId = recipient.id;
        chatRecipientName.textContent = `Sohbet (${recipient.name})`;
        messagesDisplay.innerHTML = ''; // Yeni sohbet için mesajları temizle
        
        // Önceki dinleyiciyi durdur (varsa)
        // Bu önemli, yoksa her alıcı değişiminde yeni bir dinleyici eklenir!
        if (window.unsubscribeMessages) {
            window.unsubscribeMessages();
        }

        // Seçilen alıcı ile mesajları dinlemeye başla
        listenForMessages();

        // Kullanıcı listesindeki aktif sınıfı güncelle
        Array.from(userListElement.children).forEach(li => {
            li.classList.remove('active-user');
        });
        const selectedLi = userListElement.querySelector(`li[data-id="${recipient.id}"]`);
        if (selectedLi) {
            selectedLi.classList.add('active-user');
        }
    }

    // --- Mesajları Dinleme (Firestore Realtime Listener) ---
    function listenForMessages() {
        if (!currentUser || !currentRecipientId) {
            console.warn("Mesajları dinlemek için geçerli kullanıcı veya alıcı yok.");
            return;
        }

        // Sohbet ID'sini oluştur (her zaman küçük ID önce gelecek şekilde)
        // Bu, user1 ile user2 arasındaki sohbetin her zaman "user1_user2" olmasını sağlar.
        const chatRoomId = [currentUser.id, currentRecipientId].sort().join('_');
        console.log(`Sohbet odası dinleniyor: ${chatRoomId}`);

        // Firestore'dan mesajları gerçek zamanlı dinle
        window.unsubscribeMessages = db.collection('chats')
            .doc(chatRoomId)
            .collection('messages')
            .orderBy('timestamp') // Zaman damgasına göre sırala
            .onSnapshot((snapshot) => {
                messagesDisplay.innerHTML = ''; // Mesajları tekrar yüklemeden önce temizle
                snapshot.forEach((doc) => {
                    const message = doc.data();
                    displayMessage(message);
                });
                messagesDisplay.scrollTop = messagesDisplay.scrollHeight; // En alta kaydır
            }, (error) => {
                console.error("Mesajlar dinlenirken hata oluştu: ", error);
            });
    }

    // --- Mesaj Gönderme İşlemleri (Firestore'a Kaydetme) ---
    sendButton.addEventListener('click', async () => {
        const messageText = messageInput.value.trim();

        if (messageText && currentUser && currentRecipientId) {
            // Sohbet ID'sini oluştur
            const chatRoomId = [currentUser.id, currentRecipientId].sort().join('_');

            try {
                await db.collection('chats').doc(chatRoomId).collection('messages').add({
                    senderId: currentUser.id,
                    recipientId: currentRecipientId,
                    text: messageText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() // Sunucu zaman damgası
                });
                messageInput.value = ''; // Mesaj kutusunu temizle
            } catch (error) {
                console.error("Mesaj gönderilirken hata oluştu: ", error);
                alert("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
            }
        } else if (!currentRecipientId) {
            alert("Lütfen mesaj göndermek için bir kişi seçin.");
        }
    });

    // Enter tuşuyla mesaj gönderme
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    // --- Mesajı Ekranda Görüntüleme Fonksiyonu ---
    function displayMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        // Mesajın kimden geldiğine göre stil belirle
        if (message.senderId === currentUser.id) {
            messageDiv.classList.add('outgoing');
        } else {
            messageDiv.classList.add('incoming');
        }
        
        messageDiv.innerHTML = `<p>${message.text}</p>`;
        messagesDisplay.appendChild(messageDiv);
    }
});