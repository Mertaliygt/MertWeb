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

// Firestore ve Auth instance'larını al
const db = firebase.firestore();
const auth = firebase.auth();

// Global değişkenler
let currentUser = null; // Giriş yapan kullanıcının Firebase User objesi
let currentRecipientId = null; // Mesaj gönderilecek alıcı ID'si (UID)
let unsubscribeMessages = null; // Firestore dinleyicisini durdurmak için

// Kullanıcı UID'lerini isimlerle eşleştiren geçici bir harita
// Gerçek uygulamada bu bilgiyi Firestore'daki bir 'users' koleksiyonundan çekerdik.
const userNames = {
    // Bu UID'leri Firebase Authentication'dan alıp buraya yazmanız gerekecek!
    // Örnek: 'adminUID': 'Admin', 'mertUID': 'Mert', ...
    // Şimdilik e-posta adreslerinin "@" öncesi kısmını kullanacağız,
    // ancak gerçekte Firebase UID'leri kullanılmalıdır.
    // Bu kısım, kullanıcıları Firebase Auth'tan çektikten sonra güncellenecek.
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const authContainer = document.querySelector('.auth-container');
    const appContainer = document.querySelector('.app-container'); // Yeni ana uygulama divi
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesDisplay = document.getElementById('messagesDisplay');
    const userListElement = document.getElementById('userList');
    const chatRecipientName = document.getElementById('chatRecipientName');
    const loggedInUserName = document.getElementById('loggedInUserName');
    const logoutButton = document.getElementById('logoutButton');
    const adminPanelButton = document.getElementById('adminPanelButton');
    const adminPanel = document.querySelector('.admin-panel');
    const chatContainer = document.querySelector('.chat-container'); // Sohbet alanının kendisi
    const backToChatButton = document.getElementById('backToChatButton');
    const allMessagesDisplay = document.getElementById('allMessagesDisplay');

    // --- Firebase Authentication Durum Değişikliği Dinleyicisi ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // Kullanıcı giriş yapmış
            currentUser = user; // Firebase User objesini ata
            loggedInUserName.textContent = `Hoşgeldin, ${user.email.split('@')[0]}!`; // E-postadan kullanıcı adını al
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex'; // Ana uygulama divini göster

            // Admin kontrolü
            if (user.email === 'admin@example.com') { // Admin e-postası ile kontrol
                adminPanelButton.style.display = 'block';
            } else {
                adminPanelButton.style.display = 'none';
            }

            loadUsers(); // Kullanıcı listesini yükle
            console.log('Kullanıcı giriş yaptı:', currentUser.uid);

        } else {
            // Kullanıcı çıkış yapmış veya giriş yapmamış
            currentUser = null;
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            adminPanelButton.style.display = 'none';
            console.log('Kullanıcı çıkış yaptı veya giriş yapmadı.');
        }
    });

    // --- Giriş İşlemleri ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged dinleyicisi otomatik olarak UI'ı güncelleyecek
            console.log('Giriş başarılı!');
        } catch (error) {
            console.error("Giriş hatası: ", error.message);
            alert('Giriş başarısız: ' + error.message);
        }
    });

    // --- Çıkış Yap İşlemi ---
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            // onAuthStateChanged dinleyicisi otomatik olarak UI'ı güncelleyecek
            console.log('Çıkış başarılı!');
        } catch (error) {
            console.error("Çıkış hatası: ", error.message);
            alert('Çıkış başarısız: ' + error.message);
        }
    });

    // --- Kullanıcı Listesini Yükleme (Şimdilik Sabit Kullanıcılar) ---
    // NOT: Gerçek uygulamada bu kullanıcıları Firebase Firestore'daki bir 'users' koleksiyonundan çekerdiniz.
    // Şimdilik sadece e-posta adreslerinin "@" öncesi kısmını ID ve isim olarak kullanacağız.
    // Ancak Firebase Authentication'dan gelen 'user.uid' gerçek ID'dir.
    async function loadUsers() {
        userListElement.innerHTML = ''; // Mevcut listeyi temizle

        // Örnek kullanıcılar (Firebase Authentication'da oluşturduğunuz e-postalarla eşleşmeli)
        const predefinedUsers = [
            { email: 'admin@example.com', name: 'Admin' },
            { email: 'mert@example.com', name: 'Mert' },
            { email: 'zeynep@example.com', name: 'Zeynep' },
            { email: 'baran@example.com', name: 'Baran' },
            { email: 'melike@example.com', name: 'Melike' }
        ];

        // Firebase Auth'tan tüm kullanıcıları doğrudan çekmek istemci tarafında güvenlik açığı oluşturabilir.
        // Bu yüzden, şimdilik bu predefinedUsers listesini kullanacağız
        // ve Firestore'a kaydederken currentUser.uid kullanacağız.
        // Kullanıcı listesinde görüntülerken user.email.split('@')[0] kullanacağız.

        predefinedUsers.forEach(user => {
            if (user.email !== currentUser.email) { // Kendini listeleme
                const li = document.createElement('li');
                li.textContent = user.name;
                // Kullanıcı ID'si olarak e-postanın "@" öncesi kısmını kullanıyoruz.
                // Gerçekte, Firebase UID'sini kullanmalıyız.
                li.dataset.id = user.email.split('@')[0]; // Örneğin 'mert'
                li.addEventListener('click', () => selectRecipient(user.email.split('@')[0], user.name));
                userListElement.appendChild(li);
            }
        });
    }

    // --- Alıcı Seçme İşlemi ---
    function selectRecipient(recipientId, recipientName) {
        currentRecipientId = recipientId;
        chatRecipientName.textContent = `Sohbet (${recipientName})`;
        messagesDisplay.innerHTML = ''; // Yeni sohbet için mesajları temizle
        
        // Önceki dinleyiciyi durdur (varsa)
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        // Seçilen alıcı ile mesajları dinlemeye başla
        listenForMessages();

        // Kullanıcı listesindeki aktif sınıfı güncelle
        Array.from(userListElement.children).forEach(li => {
            li.classList.remove('active-user');
        });
        const selectedLi = userListElement.querySelector(`li[data-id="${recipientId}"]`);
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
        // Burada currentUser.uid ve currentRecipientId kullanıyoruz.
        const chatRoomId = [currentUser.uid, currentRecipientId].sort().join('_');
        console.log(`Sohbet odası dinleniyor: ${chatRoomId}`);

        unsubscribeMessages = db.collection('chats')
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
            const chatRoomId = [currentUser.uid, currentRecipientId].sort().join('_');

            try {
                await db.collection('chats').doc(chatRoomId).collection('messages').add({
                    senderId: currentUser.uid, // Gönderenin UID'si
                    recipientId: currentRecipientId, // Alıcının UID'si
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
        if (message.senderId === currentUser.uid) { // UID'ye göre kontrol
            messageDiv.classList.add('outgoing');
        } else {
            messageDiv.classList.add('incoming');
        }
        
        // Mesajı gönderen ve alanın isimlerini göstermek için (geçici)
        // Gerçekte, bu UID'leri isimlere çevirmek için bir 'users' koleksiyonu kullanırdık.
        const senderName = message.senderId === currentUser.uid ? 'Sen' : (userNames[message.senderId] || message.senderId);
        const recipientName = message.recipientId === currentUser.uid ? 'Sen' : (userNames[message.recipientId] || message.recipientId);

        // Tarih ve saat formatı
        let timeString = '';
        if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            timeString = ` (${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
        }

        messageDiv.innerHTML = `<p><strong>${senderName}:</strong> ${message.text}${timeString}</p>`;
        messagesDisplay.appendChild(messageDiv);
    }

    // --- Admin Paneli Fonksiyonları ---
    adminPanelButton.addEventListener('click', () => {
        chatContainer.style.display = 'none'; // Sohbet alanını gizle
        adminPanel.style.display = 'flex'; // Admin panelini göster
        loadAllMessagesForAdmin(); // Tüm mesajları yükle
    });

    backToChatButton.addEventListener('click', () => {
        adminPanel.style.display = 'none'; // Admin panelini gizle
        chatContainer.style.display = 'flex'; // Sohbet alanını göster
        // Eğer bir alıcı seçiliyse mesajları tekrar dinlemeye başla
        if (currentRecipientId) {
            listenForMessages();
        }
    });

    // --- Admin İçin Tüm Mesajları Yükleme ---
    async function loadAllMessagesForAdmin() {
        allMessagesDisplay.innerHTML = ''; // Önceki mesajları temizle
        const allMessages = [];

        try {
            // Tüm sohbet odalarını al
            const chatsSnapshot = await db.collection('chats').get();

            for (const chatDoc of chatsSnapshot.docs) {
                const chatRoomId = chatDoc.id;
                // Her sohbet odasındaki mesajları al
                const messagesSnapshot = await db.collection('chats').doc(chatRoomId).collection('messages').orderBy('timestamp').get();
                
                messagesSnapshot.forEach(msgDoc => {
                    allMessages.push(msgDoc.data());
                });
            }

            // Mesajları zamana göre sırala (tüm sohbet odalarından gelenler)
            allMessages.sort((a, b) => a.timestamp - b.timestamp);

            // Admin konsol formatında göster
            allMessages.forEach(message => {
                // UID'leri isimlere çevirmek için geçici bir harita kullanıyoruz.
                // Gerçekte Firebase Auth'tan veya 'users' koleksiyonundan çekerdik.
                const senderName = message.senderId.split('@')[0] || message.senderId; // UID'den isim tahmini
                const recipientName = message.recipientId.split('@')[0] || message.recipientId; // UID'den isim tahmini

                let timeString = '';
                if (message.timestamp && message.timestamp.toDate) {
                    const date = message.timestamp.toDate();
                    timeString = ` (${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
                }

                const logEntry = document.createElement('div');
                logEntry.classList.add('admin-log-entry'); // CSS için yeni sınıf
                logEntry.textContent = `ID=${senderName} ID=${recipientName} mesaj > ${message.text}${timeString}`;
                allMessagesDisplay.appendChild(logEntry);
            });

        } catch (error) {
            console.error("Tüm mesajlar yüklenirken hata oluştu: ", error);
            allMessagesDisplay.textContent = "Mesajlar yüklenirken bir hata oluştu.";
        }
    }
});