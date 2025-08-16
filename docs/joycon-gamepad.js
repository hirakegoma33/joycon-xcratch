// joycon-gamepad.js  (Xcratch/TurboWarp 用：unsandboxed拡張)
// 参考: TurboWarp 拡張の基本形は Scratch.extensions.register(...) を呼ぶスタイル
// https://docs.turbowarp.org/development/extensions/hello-world

class JoyConGamepad {
  constructor (runtime) {
    this.runtime = runtime;
    this.gamepadIndex = null;
    this.buttons = [];
    this.axes = [];
    this.connected = false;

    // ブラウザイベント（接続/切断）
    window.addEventListener('gamepadconnected', (e) => {
      if (this.gamepadIndex === null) this.gamepadIndex = e.gamepad.index;
      this.connected = true;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
      this.connected = (navigator.getGamepads?.() || []).some(p => p);
    });

    // ループ開始
    const loop = () => {
      const pads = navigator.getGamepads?.() || [];
      const gp = (this.gamepadIndex != null) ? pads[this.gamepadIndex] : pads.find(p => p);
      if (gp) {
        this.connected = true;
        this.buttons = gp.buttons.map(b => !!b?.pressed);
        this.axes = gp.axes.slice(0);
      } else {
        this.connected = false;
        this.buttons = [];
        this.axes = [];
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  getInfo () {
    return {
      id: 'joycon',
      name: 'Joy-Con / Gamepad',
      color1: '#00bcd4',
      docsURI: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads',
      blocks: [
        {
          opcode: 'choosePad',
          blockType: Scratch.BlockType.COMMAND,
          text: 'ゲームパッド [INDEX] を使用する',
          arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } }
        },
        {
          opcode: 'isConnected',
          blockType: Scratch.BlockType.BOOLEAN,
          text: '接続されている?'
        },
        {
          opcode: 'buttonPressed',
          blockType: Scratch.BlockType.BOOLEAN,
          text: '[BUTTON] ボタンがおされている?',
          arguments: { BUTTON: { type: Scratch.ArgumentType.STRING, menu: 'buttons' } }
        },
        {
          opcode: 'axisValue',
          blockType: Scratch.BlockType.REPORTER,
          text: 'スティック [AXIS] の値',
          arguments: { AXIS: { type: Scratch.ArgumentType.STRING, menu: 'axes' } }
        },
        {
          opcode: 'rumble',
          blockType: Scratch.BlockType.COMMAND,
          text: 'バイブレーション 強さ[STRENGTH] 時間[MS]ms',
          arguments: {
            STRENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 },
            MS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 }
          }
        }
      ],
      menus: {
        buttons: {
          acceptReporters: true,
          items: ['A','B','X','Y','L','R','ZL','ZR','Minus','Plus','Home','Capture','StickL','StickR','Up','Down','Left','Right']
        },
        axes: { acceptReporters: true, items: ['LX','LY','RX','RY'] }
      }
    };
  }

  choosePad ({INDEX}) {
    const idx = Math.max(0, Math.floor(Number(INDEX)));
    const pads = navigator.getGamepads?.() || [];
    if (pads[idx]) {
      this.gamepadIndex = idx;
      this.connected = true;
    }
  }

  isConnected () { return this.connected; }

  _buttonIndexByName (name) {
    return ({
      'A':0,'B':1,'X':2,'Y':3,'L':4,'R':5,'ZL':6,'ZR':7,
      'Minus':8,'Plus':9,'StickL':10,'StickR':11,
      'Up':12,'Down':13,'Left':14,'Right':15,'Home':16,'Capture':17
    })[name] ?? 0;
  }

  buttonPressed ({BUTTON}) {
    const idx = this._buttonIndexByName(String(BUTTON));
    return !!this.buttons[idx];
  }

  axisValue ({AXIS}) {
    const map = { 'LX':0, 'LY':1, 'RX':2, 'RY':3 };
    const v = this.axes[map[String(AXIS)] ?? 0] ?? 0;
    return Math.round(v * 1000) / 1000;
  }

  async rumble ({STRENGTH, MS}) {
    const pads = navigator.getGamepads?.() || [];
    const gp = (this.gamepadIndex != null) ? pads[this.gamepadIndex] : pads.find(p => p);
    if (!gp || !gp.vibrationActuator) return;
    try {
      await gp.vibrationActuator.playEffect('dual-rumble', {
        duration: Math.max(1, Math.floor(Number(MS))),
        strongMagnitude: Math.max(0, Math.min(1, Number(STRENGTH))),
        weakMagnitude: Math.max(0, Math.min(1, Number(STRENGTH)))
      });
    } catch (_) {}
  }
}

Scratch.extensions.register(new JoyConGamepad());
