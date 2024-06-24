import asyncio
import websockets
from transcriber import AudioTranscriberServicer
import logging
import json
from aiohttp import web

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize the transcriber
transcriber = AudioTranscriberServicer()

# Dictionary to store connected clients and their audio data
clients = {}


async def transcribe_handler(websocket, path):
    client_address = websocket.remote_address
    logger.info(f"New WebSocket connection from {client_address}")
    try:
        # Add the new client to the clients dictionary
        clients[websocket] = []
        async for message in websocket:
            audio_data = (
                message if isinstance(message, bytes) else message.encode("utf-8")
            )
            # Store the audio data for the current client
            clients[websocket].append(audio_data)
            # Transcribe the audio data
            await transcriber.transcribe_audio(websocket, audio_data)
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"WebSocket connection closed by {client_address}")
    finally:
        # Remove the client from the clients dictionary when the connection is closed
        del clients[websocket]
        logger.info(f"Closing WebSocket connection with {client_address}")


async def healthcheck(request):
    return web.Response(text="OK", status=200)


async def start_server():
    # Create an aiohttp application
    app = web.Application()
    app.router.add_get("/healthcheck", healthcheck)

    # Start the aiohttp server
    runner = web.AppRunner(app)
    await runner.setup()
    http_site = web.TCPSite(runner, "0.0.0.0", 8080)
    await http_site.start()
    logger.info(f"HTTP server started on http://0.0.0.0:8080")

    # Start the WebSocket server
    ws_server = await websockets.serve(transcribe_handler, "0.0.0.0", 8765)
    logger.info(f"WebSocket server started on ws://0.0.0.0:8765")

    # Run both servers concurrently
    await asyncio.gather(
        ws_server.wait_closed(), asyncio.Future()  # This will run forever
    )


if __name__ == "__main__":
    asyncio.run(start_server())
