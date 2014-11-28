var MessagingQueue = require('../lib/MessagingQueue.js');
var messagingQueue = new MessagingQueue();
var numMessages = 100;
var numClients = 10;

for (i = 0; i < numMessages; ++i) {
    messagingQueue.addMessage({
        id: 99 - i,
        to: i % numClients,
        created: new Date().toISOString()
    });
}

console.log(messagingQueue.getAllMessagesForClient(9));
console.log(messagingQueue.queue.db.length);
messagingQueue.deleteMessageById(0);
console.log(messagingQueue.getAllMessagesForClient(9));
console.log(messagingQueue.queue.db.length);
