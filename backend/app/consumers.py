from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.room_name = self.scope['url']['kwargs']['room_name']
        self.group_room_name = f"chat{self.room_name}"

        await self.accept()

        await self.send(text_data=json.dumps({
            'message': 'You are connected!'
        }))

    async def disconnect(self, close_code):
        
        # await self.channel_layer.group_discard(
            
        # )

        pass

    async def receive(self, text_data):

        data = json.loads(text_data)
        message = data.get('message', '')
        sender = data.get('sender' ,'')
        receiver = data.get('receiver' , '')


        await self.channel_layer.group_send(
            {
                "type" : "send_message" ,
                "message" : message ,
                "sender" : sender ,
                "receiver" : receiver 
            }
        )

    # async def send_message ( self , text_data  
