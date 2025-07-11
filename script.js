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
let allUsers = []; // Tüm uygulama kullanıcılarını tutacak array (Firebase Auth'tan çekilecek)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const authContainer = document.querySelector('.auth-container');
    const appContainer = document.querySelector('.app-container');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesDisplay = document.getElementById('messagesDisplay');
    const userListElement = document.getElementById('userList');
    const chatRecipientName = document.getElementById('chatRecipientName');
    const loggedInUserName = document.getElementById('loggedInUserName');
    const logoutButton = document.getElementById('logoutButton');
    const adminPanelButton = document.getElementById('adminPanelButton');
    const adminPanel = document.querySelector('.admin-panel');
    const chatContainer = document.querySelector('.chat-container');
    const backToChatButton = document.getElementById('backToChatButton');
    const allMessagesDisplay = document.getElementById('allMessagesDisplay');

    // --- Firebase Authentication Durum Değişikliği Dinleyicisi ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            loggedInUserName.textContent = `Hoşgeldin, ${user.email.split('@')[0]}!`;
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';

            if (user.email === 'admin@example.com') { // Admin e-postası ile kontrol
                adminPanelButton.style.display = 'block';
            } else {
                adminPanelButton.style.display = 'none';
            }

            await loadUsers(); // Kullanıcı listesini yükle
            console.log('Kullanıcı giriş yaptı:', currentUser.uid);

        } else {
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
            console.log('Çıkış başarılı!');
        } catch (error) {
            console.error("Çıkış hatası: ", error.message);
            alert('Çıkış başarısız: ' + error.message);
        }
    });

    // --- Kullanıcı Listesini Yükleme (Firebase Authentication'dan çekiliyor gibi davranıyoruz) ---
    async function loadUsers() {
        userListElement.innerHTML = '';
        allUsers = []; // Array'i temizle

        try {
            // ÖNEMLİ: Aşağıdaki 'userMappings' objesini KENDİ Firebase Authentication panelinizden
            // oluşturduğunuz kullanıcıların GERÇEK UID'leri ile doldurmanız GEREKİYOR.
            // Her bir kullanıcının UID'sini Authentication panelinden kopyalayın!
            const userMappings = [
                { uid: '0EdlNSUl34c7duJ7alK4EqSDkWN2', email: 'admin@example.com', name: 'Admin' },
                { uid: 'jDdniNAtuoSdNq4mht96pcvMFph1', email: 'mert@example.com', name: 'Mert' },
                { uid: 'BzsJeb4L1OTb850fibgs5ZgE1tg2', email: 'zeynep@example.com', name: 'Zeynep' },
                { uid: '82UKk2pogpNbD8laDSUDVobVm5q2', email: 'baran@example.com', name: 'Baran' },
                { uid: '0iZuX6rG6vXMDE6liIgpnblooLW2', email: 'melike@example.com', name: 'Melike' }
            ];

            // Oluşturduğunuz kullanıcıları 'allUsers' array'ine ekle
            userMappings.forEach(u => {
                // Sadece giriş yapan kullanıcı kendisi değilse listeye ekle
                if (currentUser && u.uid !== currentUser.uid) { 
                    allUsers.push({ id: u.uid, name: u.name, email: u.email });
                }
            });

            // Kullanıcı listesini UI'a ekle
            allUsers.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.name;
                li.dataset.id = user.id; // data-id olarak kullanıcının UID'sini sakla
                li.addEventListener('click', () => selectRecipient(user.id, user.name));
                userListElement.appendChild(li);
            });

        } catch (error) {
            console.error("Kullanıcılar yüklenirken hata oluştu: ", error);
        }
    }

    // --- Alıcı Seçme İşlemi ---
    function selectRecipient(recipientUid, recipientName) {
        currentRecipientId = recipientUid; // currentRecipientId artık UID
        chatRecipientName.textContent = `Sohbet (${recipientName})`;
        messagesDisplay.innerHTML = '';
        
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        listenForMessages();

        Array.from(userListElement.children).forEach(li => {
            li.classList.remove('active-user');
        });
        const selectedLi = userListElement.querySelector(`li[data-id="${recipientUid}"]`);
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

        const chatRoomId = [currentUser.uid, currentRecipientId].sort().join('_');
        console.log(`Sohbet odası dinleniyor: ${chatRoomId}`);

        unsubscribeMessages = db.collection('chats')
            .doc(chatRoomId)
            .collection('messages')
            .orderBy('timestamp')
            .onSnapshot((snapshot) => {
                messagesDisplay.innerHTML = '';
                snapshot.forEach((doc) => {
                    const message = doc.data();
                    displayMessage(message);
                });
                messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
            }, (error) => {
                console.error("Mesajlar dinlenirken hata oluştu: ", error);
            });
    }

    // --- Mesaj Gönderme İşlemleri (Firestore'a Kaydetme) ---
    sendButton.addEventListener('click', async () => {
        const messageText = messageInput.value.trim();

        if (messageText && currentUser && currentRecipientId) {
            const chatRoomId = [currentUser.uid, currentRecipientId].sort().join('_');

            try {
                await db.collection('chats').doc(chatRoomId).collection('messages').add({
                    senderId: currentUser.uid,
                    recipientId: currentRecipientId,
                    text: messageText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                messageInput.value = '';
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

        if (message.senderId === currentUser.uid) {
            messageDiv.classList.add('outgoing');
        } else {
            messageDiv.classList.add('incoming');
        }
        
        // UID'yi isme çevir (allUsers listesinden)
        const getDisplayName = (uid) => {
            if (uid === currentUser.uid) return 'Sen';
            const user = allUsers.find(u => u.id === uid);
            return user ? user.name : uid.substring(0, 6) + '...'; // Bulamazsa UID'nin başını göster
        };

        const senderName = getDisplayName(message.senderId);
        // recipientName burada mesaj görüntüleme için gerekli değil, ancak debug için tutulabilir
        // const recipientName = getDisplayName(message.recipientId); 

        let timeString = '';
        if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            timeString = ` (${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')})`;
        }

        messageDiv.innerHTML = `<p><strong>${senderName}:</strong> ${message.text}${timeString}</p>`;
        messagesDisplay.appendChild(messageDiv);
    }

    // --- Admin Paneli Fonksiyonları ---
    adminPanelButton.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        adminPanel.style.display = 'flex';
        loadAllMessagesForAdmin();
    });

    backToChatButton.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        chatContainer.style.display = 'flex';
        if (currentRecipientId) { // Admin panelinden çıkınca seçili alıcı varsa dinlemeyi tekrar başlat
            listenForMessages();
        }
    });

    // --- Admin İçin Tüm Mesajları Yükleme ---
    async function loadAllMessagesForAdmin() {
        allMessagesDisplay.innerHTML = '';
        const allMessages = [];

        try {
            const chatsSnapshot = await db.collection('chats').get();

            for (const chatDoc of chatsSnapshot.docs) {
                const messagesSnapshot = await db.collection('chats').doc(chatDoc.id).collection('messages').orderBy('timestamp').get();
                
                messagesSnapshot.forEach(msgDoc => {
                    allMessages.push(msgDoc.data());
                });
            }

            // Mesajları zamana göre sırala (tüm sohbet odalarından gelenler)
            allMessages.sort((a, b) => {
                // Firebase Timestamp objelerini karşılaştırmak için toMillis() kullanın
                const timestampA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : 0;
                const timestampB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : 0;
                return timestampA - timestampB;
            });


            allMessages.forEach(message => {
                // UID'yi isme çevir (allUsers listesinden veya direkt e-posta split ile)
                const getDisplayNameFromAllUsers = (uid) => {
                    const user = allUsers.find(u => u.id === uid);
                    // Eğer allUsers listesinde bulamazsa (ki admin olarak tüm kullanıcıları görmeliyiz),
                    // varsayılan olarak UID'nin ilk 6 karakterini göster.
                    // Admin paneli olduğu için adminin kendi UID'sini de isim olarak göstermeliyiz.
                    const adminUser = userMappings.find(u => u.uid === uid && u.email === 'admin@example.com');
                    if (adminUser) return adminUser.name;
                    return user ? user.name : uid.substring(0, 6) + '...'; 
                };

                const senderName = getDisplayNameFromAllUsers(message.senderId);
                const recipientName = getDisplayNameFromAllUsers(message.recipientId);

                let timeString = '';
                if (message.timestamp && message.timestamp.toDate) {
                    const date = message.timestamp.toDate();
                    timeString = ` (${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')})`;
                }

                const logEntry = document.createElement('div');
                logEntry.classList.add('admin-log-entry');
                // İstediğiniz format: "ID=mert ID=zeynep mesaj > ne yapıyorsun (tarih saat)"
                logEntry.textContent = `ID=${senderName} ID=${recipientName} mesaj > ${message.text}${timeString}`;
                allMessagesDisplay.appendChild(logEntry);
            });

        } catch (error) {
            console.error("Tüm mesajlar yüklenirken hata oluştu: ", error);
            allMessagesDisplay.textContent = "Mesajlar yüklenirken bir hata oluştu.";
        }
    }
});