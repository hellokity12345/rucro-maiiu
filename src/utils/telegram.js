import axios from 'axios';

const sendMessage = async (message) => {
    console.log('📨 sendMessage được gọi với message:', message);
    const messageId = localStorage.getItem('messageId');
    const oldMessage = localStorage.getItem('message');

    let text;
    if (messageId) {
        console.log('🗑️ Xóa message cũ, messageId:', messageId);
        try {
            await axios.post('/api/delete-telegram', {
                messageId: messageId
            });
        } catch (deleteError) {
            console.warn('⚠️ Lỗi xóa message cũ:', deleteError);
        }
    }

    if (oldMessage) {
        text = oldMessage + '\n' + message;
        console.log('📝 Nối với message cũ');
    } else {
        text = message;
        console.log('📝 Message mới');
    }

    console.log('📤 Gửi đến /api/send-telegram, text length:', text.length);
    try {
        const response = await axios.post('/api/send-telegram', {
            message: text,
            parseMode: 'HTML'
        });

        console.log('📥 Response từ API:', response.data);

        const result = response.data;

        if (result.success) {
            localStorage.setItem('message', text);
            localStorage.setItem('messageId', result.messageId);
            console.log('✅ Gửi thành công, messageId:', result.messageId);
            return { messageId: result.messageId };
        } else {
            console.error('❌ lỗi gửi telegram:', result.error);
            return { messageId: null };
        }
    } catch (apiError) {
        console.error('❌ Lỗi API send-telegram:', apiError);
        console.error('❌ Response:', apiError.response?.data);
        console.error('❌ Status:', apiError.response?.status);
        throw apiError;
    }
};

export default sendMessage;
