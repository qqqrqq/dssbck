
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const token = '7272317203:AAEh-rkzoz1io9o1ZLBJEYE0TAwcb-hXaqg'
const http = require('http')
const { Server } = require('socket.io')


const bot = new TelegramBot(token, { polling: true });
const webAppUrl = ''
const dataFilePath = path.join(__dirname, 'data', 'data.json');


const app = express()
app.use(express.json())
app.use(cors())
const server = http.createServer(app)


const io = new Server(server, {
  cors:{
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
  }
})

io.on('connection', (socket)=>{
  console.log(`User connected ${socket.id}`)

  socket.on('join_room',(room)=>{
      socket.join(room)
      const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []);
      socket.emit('room_info', { room, clients: clientsInRoom });
      io.to(room).emit('clients_updated', clientsInRoom);

  })

  socket.on("send_message", (data)=>{
      socket.to(data.room).emit('receive_message', data)
  })
})
server.listen(3001, () => {
  console.log('SERVER IS RUNNING')
})


const saveUserData = async (userData) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка при чтении файла данных:', err);
      return;
    }

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (parseErr) {
      console.error('Ошибка при парсинге файла данных:', parseErr);
      return;
    }

    // Поиск пользователя по userId
    const existingUser = jsonData.users.find(user => user.userId === userData.userId);

    if (existingUser) {
      // Обновляем данные, если они изменились
      if (existingUser.firstName !== userData.firstName) {
        existingUser.firstName = userData.firstName;
      }
      if (existingUser.lastName !== userData.lastName) {
        existingUser.lastName = userData.lastName;
      }
      if (existingUser.photoUrl !== userData.photoUrl) {
        existingUser.photoUrl = userData.photoUrl;
      }

      console.log('Данные пользователя обновлены.');
    } else {
      // Добавляем нового пользователя, если его еще нет в списке
      jsonData.users.push(userData);
      console.log('Новый пользователь добавлен.');
    }

    // Записываем обновленные данные в файл
    fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Ошибка при записи в файл данных:', writeErr);
        return;
      }

      console.log('Данные пользователя успешно сохранены.');
    });
  });
};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text
  const userId = msg.from.id;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;
  const username = msg.from.username;
 
  try {
    const profilePhotos = await bot.getUserProfilePhotos(userId) 
    if(profilePhotos.total_count === 0){
      const userData = {
        userId,
        firstName,
        lastName,
        username,
        photoUrl:null,
      }
         
     
     await saveUserData(userData);
    }else{
      const fileId = profilePhotos.photos[0][0].file_id || null
      const file = await bot.getFile(fileId); 
      const photoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
  
      const userData = {
        userId,
        firstName,
        lastName,
        username,
        photoUrl
      }
   

     const response = await fetch('http://localhost:8000/web-data',{
        method:'POST',
        headers: {
          'Content-Type':'application/json'
        },
        body: JSON.stringify(userData)
      }).then(res =>{
        console.log('finish')
      })
      
     await saveUserData(userData);
      bot.sendMessage(chatId, 'loaded')
    }
   
  }
  catch (e) {

  }








  if (text === '/start') {

    const message = 'Нажмите на кнопку ниже:';
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Играть в 1 клик',
              web_app: {
                url: 'https://stunning-baklava-53cfdc.netlify.app'  // Замените на URL вашего веб-приложения
              }
            }
          ],
          [
            {
              text: 'Подписаться',
              url: 'ya.ru'
            }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, message, options)
  } else {
    bot.sendMessage(chatId, 'Received your message');
  }
});

app.post('/web-data', (req, res) => {

  return res.status(200).send('Data received');
});





const PORT = process.env.PORT ?? 8000
app.listen(PORT, ()=>{
  console.log(`server started ${PORT}`)
})