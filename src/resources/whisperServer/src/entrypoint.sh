#!/bin/bash

export LD_LIBRARY_PATH=`python3 -c 'import os; import nvidia.cublas.lib; import nvidia.cudnn.lib; print(os.path.dirname(nvidia.cublas.lib.__file__) + ":" + os.path.dirname(nvidia.cudnn.lib.__file__))'`
python3 -c "from faster_whisper import WhisperModel; import os; WhisperModel(os.environ['MODEL'])"
python3 server.py