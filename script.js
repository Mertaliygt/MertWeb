const firebaseConfig = {
    apiKey: "AIzaSyAi9VQeCdlFfiF-LSiOKtqrsFUKKhUbSUM",
    authDomain: "mertweb-ff6d4.firebaseapp.com",
    projectId: "mertweb-ff6d4",
    storageBucket: "mertweb-ff6d4.firebasestorage.app",
    messagingSenderId: "879769246670",
    appId: "1:879769246670:web:28eca71c4fb188ae8f699f",
    measurementId: "G-J4JFJCVPJ1"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentRecipientId = null;
let unsubscribeMessages = null;
let allUsers = [];

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

    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            loggedInUserName.textContent = `Hoşgeldin, ${user.email.split('@')[0]}!`;
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';

            if (user.email === 'admin@example.com') {
                adminPanelButton.style.display = 'block';
            } else {
                adminPanelButton.style.display = 'none';
            }

            await loadUsers();
            console.log('Kullanıcı giriş yaptı:', currentUser.uid);

        } else {
            currentUser = null;
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            adminPanelButton.style.display = 'none';
            console.log('Kullanıcı çıkış yaptı veya giriş yapmadı.');
        }
    });

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

    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            console.log('Çıkış başarılı!');
        } catch (error) {
            console.error("Çıkış hatası: ", error.message);
            alert('Çıkış başarısız: ' + error.message);
        }
    });

    async function loadUsers() {
        userListElement.innerHTML = '';
        allUsers = [];

        try {
            const userMappings = [
                { uid: '0EdlNSUl34c7duJ7alK4EqSDkWN2', email: 'admin@example.com', name: 'Admin' },
                { uid: 'nNhtAK4JUPYUYuJIyCBpWwZRMKF2', email: 'mert@may.com', name: 'Mert' },
                { uid: 'g806NcWR4Oe6ha3RKXPEXSvczmA2', email: 'zeynep@may.com', name: 'Zeynep' },
                { uid: 'dzIGu8GMr1VOETqLf5Lp1vC6dSw2', email: 'baran@may.com', name: 'Baran' },
                { uid: 'Ex7mtNTGEUR9AXDpGE59kWaKGpP2', email: 'melike@may.com', name: 'Melike' }
            ];

            userMappings.forEach(u => {
                if (currentUser && u.uid !== currentUser.uid) { 
                    allUsers.push({ id: u.uid, name: u.name, email: u.email });
                }
            });

            allUsers.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.name;
                li.dataset.id = user.id;
                li.addEventListener('click', () => selectRecipient(user.id, user.name));
                userListElement.appendChild(li);
            });

        } catch (error) {
            console.error("Kullanıcılar yüklenirken hata oluştu: ", error);
        }
    }

    function selectRecipient(recipientUid, recipientName) {
        currentRecipientId = recipientUid;
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

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });

    function displayMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        if (message.senderId === currentUser.uid) {
            messageDiv.classList.add('outgoing');
        } else {
            messageDiv.classList.add('incoming');
        }
        
        const getDisplayName = (uid) => {
            if (uid === currentUser.uid) return 'Sen';
            const user = allUsers.find(u => u.id === uid);
            return user ? user.name : uid.substring(0, 6) + '...';
        };

        const senderName = getDisplayName(message.senderId);

        let timeString = '';
        if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            timeString = ` (${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')})`;
        }

        messageDiv.innerHTML = `<p><strong>${senderName}:</strong> ${message.text}${timeString}</p>`;
        messagesDisplay.appendChild(messageDiv);
    }

    adminPanelButton.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        adminPanel.style.display = 'flex';
        loadAllMessagesForAdmin();
    });

    backToChatButton.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        chatContainer.style.display = 'flex';
        if (currentRecipientId) {
            listenForMessages();
        }
    });

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

            allMessages.sort((a, b) => {
                const timestampA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : 0;
                const timestampB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : 0;
                return timestampA - timestampB;
            });

            allMessages.forEach(message => {
                const getDisplayNameFromAllUsers = (uid) => {
                    const user = allUsers.find(u => u.id === uid);
                    const adminUserMapping = [
                        { uid: '0EdlNSUl34c7duJ7alK4EqSDkWN2', email: 'admin@example.com', name: 'Admin' },
                        { uid: 'nNhtAK4JUPYUYuJIyCBpWwZRMKF2', email: 'mert@may.com', name: 'Mert' },
                        { uid: 'g806NcWR4Oe6ha3RKXPEXSvczmA2', email: 'zeynep@may.com', name: 'Zeynep' },
                        { uid: 'dzIGu8GMr1VOETqLf5Lp1vC6dSw2', email: 'baran@may.com', name: 'Baran' },
                        { uid: 'Ex7mtNTGEUR9AXDpGE59kWaKGpP2', email: 'melike@may.com', name: 'Melike' }
            ];
                    const adminUser = adminUserMapping.find(u => u.uid === uid);
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
                logEntry.textContent = `ID=${senderName} ID=${recipientName} mesaj > ${message.text}${timeString}`;
                allMessagesDisplay.appendChild(logEntry);
            });

        } catch (error) {
            console.error("Tüm mesajlar yüklenirken hata oluştu: ", error);
            allMessagesDisplay.textContent = "Mesajlar yüklenirken bir hata oluştu.";
        }
    }
});