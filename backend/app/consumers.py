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

        if data.get('type') == 'chat_message':
            

            message = data.get('message')
            user = data.get('sender')
            receiver = data.get('receiver')

            await self.save_message(message, user, receiver)

            await self.channel_layer.group_send(
                self.room_group_name ,
                {
                    "type": "chat_message",
                    "message": message,
                    "sender": user,
                    "receiver": receiver
                }
            )
        elif data.get('type') == 'file_message':

            message = data.get('message')
            user = data.get('sender')
            receiver = data.get('receiver')
            file_type = data.get('file_type')
            file_url = data.get('file_url')
            timestamp = data.get('timestamp')

            await self.channel_layer.group_send(
                self.room_group_name ,
                {
                    "type": "file_message",
                    "message": message,
                    "sender": user,
                    "receiver": receiver,
                    "file_type": file_type,
                    "file_url": file_url,
                    "timestamp": timestamp
                }
            )


    async def file_message ( self , event ) :
        
    
        await self.send( text_data=json.dumps(
            {
                "type": "file",
                "message" : event['message'] ,
                "sender" : event['sender'] ,
                "receiver" : event['receiver'],
                "file_type": event['file_type'],
                "file_url": event['file_url'],
                "timestamp": event['timestamp']
            }
        ))


    async def chat_message ( self , event ) :

        from .models import Message
        User = get_user_model()

        print(event)

        # Save the message to the database

        await self.send( text_data=json.dumps(
            {
                "type": "chat",
                "message" : event['message'] ,
                "sender" : event['sender'] ,
                "receiver" : event['receiver']
            }
        ))

     

    async def disconnect ( self , close_code ) :
        
        await self.channel_layer.group_discard(
            self.room_group_name ,
            self.channel_name
        )

    async def save_message(self, message, sender, receiver):
            
            from .models import Message
            User = get_user_model()

            print(f"Saving message: {message} from {sender} to {receiver} in room {self.room_name}")

            try:
                sender_user = await database_sync_to_async(User.objects.get)(username=sender)
                receiver_user = await database_sync_to_async(User.objects.get)(username=receiver)

                message_instance = Message(
                    room_name=self.room_name,
                    message=message,
                    sender=sender_user,
                    receiver=receiver_user
                )
                await database_sync_to_async(message_instance.save)()
            except User.DoesNotExist:
                print(f"User {sender} or {receiver} does not exist.")
            except Exception as e:
                print(f"Error saving message: {str(e)}")
