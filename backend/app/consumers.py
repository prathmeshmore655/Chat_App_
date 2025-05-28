from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import json





class ChatConsumer ( AsyncWebsocketConsumer)  : 



    async def connect( self ) :

        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(
            self.room_group_name  ,
            self.channel_name
        )

        await self.accept()

    

    async def receive( self ,text_data ) : 

        data = json.loads(text_data)

        print("data" ,data)

        message = data.get('message')
        user = data.get('sender')
        receiver = data.get('receiver')

        await self.channel_layer.group_send(
            self.room_group_name ,
            {
                "type": "chat_message",
                "message": message,
                "sender": user,
                "receiver": receiver
            }
        )


    async def chat_message ( self , event ) :

        from .models import Message
        User = get_user_model()

        print(event)

        await self.send( text_data=json.dumps(
            {
                "message" : event['message'] ,
                "sender" : event['sender'] ,
                "receiver" : event['receiver']
            }
        ))

        user_instance = await database_sync_to_async(User.objects.get)(username=event['sender'])
        rec_instance = await database_sync_to_async(User.objects.get)(username=event['receiver'])

        await database_sync_to_async(Message.objects.create)(
            room_name=self.room_name,
            message=event['message'],
            sender=user_instance,
            receiver=rec_instance
        )


    async def disconnect ( self , close_code ) :
        
        await self.channel_layer.group_discard(
            self.room_group_name ,
            self.channel_name
        )

    

    