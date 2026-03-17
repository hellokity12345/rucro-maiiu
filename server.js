import { createServer } from 'http';
import config from './api/config.js';

const sendMessage = async ({ token, chatId, message, parseMode }) => {
    const sendMessageUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode
    };

    const response = await fetch(sendMessageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`telegram api error: ${response.status} - ${errorText}`);
    }

    return await response.json();
};

const deleteMessage = async ({ token, chatId, messageId }) => {
    const deleteMessageUrl = `https://api.telegram.org/bot${token}/deleteMessage`;
    const payload = {
        chat_id: chatId,
        message_id: messageId
    };

    const response = await fetch(deleteMessageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`telegram api error: ${response.status} - ${errorText}`);
    }

    return await response.json();
};

const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/send-telegram' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { message, chatId, parseMode = 'HTML' } = JSON.parse(body);
                
                if (!message) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'thiếu message' }));
                    return;
                }

                const targetChatId = chatId === 'noti' ? config.noti_chat_id : chatId || config.chat_id;
                const telegramResponse = await sendMessage({
                    token: config.token,
                    chatId: targetChatId,
                    message,
                    parseMode
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'gửi telegram thành công',
                    messageId: telegramResponse.result?.message_id
                }));
            } catch (err) {
                console.error('lỗi gửi telegram:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'lỗi gửi telegram',
                    details: err.message
                }));
            }
        });
        return;
    }

    if (req.url === '/api/delete-telegram' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { messageId, chatId } = JSON.parse(body);
                
                if (!messageId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'thiếu messageId' }));
                    return;
                }

                const targetChatId = chatId || config.chat_id;
                await deleteMessage({
                    token: config.token,
                    chatId: targetChatId,
                    messageId
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'xóa message thành công'
                }));
            } catch (err) {
                console.error('lỗi xóa message:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'lỗi xóa message',
                    details: err.message
                }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
