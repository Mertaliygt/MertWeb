document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const authContainer = document.querySelector('.auth-container');
    const chatContainer = document.querySelector('.chat-container');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesDiv = document.querySelector('.messages');

    // --- Giriş İşlemleri ---
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Formun varsayılan gönderilme davranışını engelle

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        // Geçici doğrulama: Kullanıcı adı "admin" ve şifre "12345" ise
        if (username === 'admin' && password === '12345') {
            authContainer.style.display = 'none'; // Giriş ekranını gizle
            chatContainer.style.display = 'flex'; // Mesajlaşma ekranını göster
            console.log('Giriş başarılı!');
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
            console.log('Giriş başarısız.');
        }
    });

    // --- Mesaj Gönderme İşlemleri (Şimdilik sadece ekrana yazma) ---
    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim(); // Mesajı al ve boşlukları temizle

        if (messageText) {
            // Yeni bir mesaj div'i oluştur
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'outgoing'); // Giden mesaj stili ver
            messageDiv.innerHTML = `<p>${messageText}</p>`;

            // Mesajı sohbet alanına ekle
            messagesDiv.appendChild(messageDiv);

            // Sohbeti en aşağı kaydır (yeni mesaj görünür olsun)
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            messageInput.value = ''; // Mesaj kutusunu temizle
        }
    });

    // Enter tuşuyla mesaj gönderme
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click(); // Gönder butonuna tıklamayı simüle et
        }
    });

    // TODO: Gerçek zamanlı mesajlaşma (WebSockets), ID ile kullanıcı seçimi gibi özellikler eklenecek.
});