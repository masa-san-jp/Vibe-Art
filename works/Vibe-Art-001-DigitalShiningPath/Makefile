.PHONY: install simulate mp3 clean

install:
\tpython -m pip install -r requirements.txt

simulate:
\tpython tools/simulate.py --participants 3 --out ./DSP_Sim --duration 60

mp3:
\tpython tools/export_mp3.py --root ./DSP_Sim --bitrate 192k

clean:
\trm -rf DSP_Sim
