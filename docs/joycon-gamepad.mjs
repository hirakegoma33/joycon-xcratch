// joycon-gamepad.mjs
// Xcratch用: Joy-Con/一般ゲームパッドをGamepad APIで扱う拡張
// 使い方: Xcratch でこのURLを指定して読み込む

export default class JoyConGamepad {
  constructor (runtime) {
	this.runtime = runtime;
	this.gamepadIndex = null; // 使うゲームパッドのindex
	this.buttons = [];
	this.axes = [];
	this.connected = false;
	this._raf = null;

	// ゲームパッド接続/切断イベント
	window.addEventListener('gamepadconnected', (e) => {
	  if (this.gamepadIndex === null) {
		this.gamepadIndex = e.gamepad.index;
	  }
	  this.connected = true;
	});
	window.addEventListener('gamepaddisconnected', (e) => {
	  if (this.gamepadIndex === e.gamepad.index) {
		this.gamepadIndex = null;
	  }
	  this.connected = this._anyPadConnected();
	});

	// ポーリング開始
	this._loop = this._loop.bind(this);
	this._loop();
  }

  getInfo () {
	return {
	  id: 'joycon',
	  name: 'Joy-Con / Gamepad',
	  color1: '#00bcd4',
	  docsURI: 'https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API',
	  blocks: [
		{
		  opcode: 'choosePad',
		  blockType: Scratch.BlockType.COMMAND,
		  text: 'ゲームパッド [INDEX] を使用する',
		  arguments: {
			INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
		  }
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
		  arguments: {
			BUTTON: { type: Scratch.ArgumentType.STRING, menu: 'buttons' }
		  }
		},
		{
		  opcode: 'axisValue',
		  blockType: Scratch.BlockType.REPORTER,
		  text: 'スティック [AXIS] の値',
		  arguments: {
			AXIS: { type: Scratch.ArgumentType.STRING, menu: 'axes' }
		  }
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
		  items: [
			'A','B','X','Y',
			'L','R','ZL','ZR',
			'Minus','Plus','Home','Capture',
			'StickL','StickR','Up','Down','Left','Right'
		  ]
		},
		axes: {
		  acceptReporters: true,
		  items: [
			'LX','LY','RX','RY'
		  ]
		}
	  }
	};
  }

  // --- ランタイム内部 ---

  _anyPadConnected () {
	const pads = navigator.getGamepads?.() || [];
	return pads.some(p => p);
  }

  _readPad () {
	const pads = navigator.getGamepads?.() || [];
	const gp = (this.gamepadIndex !== null) ? pads[this.gamepadIndex] : pads.find(p => p);
	if (!gp) {
	  this.connected = false;
	  this.buttons = [];
	  this.axes = [];
	  return;
	}
	this.connected = true;
	this.buttons = gp.buttons.map(b => !!b?.pressed);
	this.axes = gp.axes.slice(0);
  }

  _loop () {
	this._readPad();
	this._raf = requestAnimationFrame(this._loop);
  }

  // --- ブロック実装 ---

  choosePad ({INDEX}) {
	const idx = Math.max(0, Math.floor(Number(INDEX)));
	const pads = navigator.getGamepads?.() || [];
	if (pads[idx]) {
	  this.gamepadIndex = idx;
	  this.connected = true;
	}
  }

  isConnected () {
	return this.connected;
  }

  // ボタンインデックス対応（一般的なマッピング/ Joy-ConはOS側の合成や左右単体で変わることに注意）
  _buttonIndexByName (name) {
	const map = {
	  'A': 0, 'B': 1, 'X': 2, 'Y': 3,
	  'L': 4, 'R': 5, 'ZL': 6, 'ZR': 7,
	  'Minus': 8, 'Plus': 9,
	  'StickL': 10, 'StickR': 11,
	  'Up': 12, 'Down': 13, 'Left': 14, 'Right': 15,
	  'Home': 16, 'Capture': 17
	};
	return map[name] ?? 0;
  }

  buttonPressed ({BUTTON}) {
	const idx = this._buttonIndexByName(String(BUTTON));
	return !!this.buttons[idx];
	// ないときはfalse
  }

  // 軸マッピング（-1.0〜1.0）
  axisValue ({AXIS}) {
	const map = { 'LX': 0, 'LY': 1, 'RX': 2, 'RY': 3 };
	const idx = map[String(AXIS)] ?? 0;
	const val = this.axes[idx] ?? 0;
	// スクラッチ的に扱いやすいよう小数3桁に丸め
	return Math.round(val * 1000) / 1000;
  }

  async rumble ({STRENGTH, MS}) {
	const pads = navigator.getGamepads?.() || [];
	const gp = (this.gamepadIndex !== null) ? pads[this.gamepadIndex] : pads.find(p => p);
	if (!gp || !gp.vibrationActuator) return;
	const s = Math.max(0, Math.min(1, Number(STRENGTH)));
	const d = Math.max(1, Math.floor(Number(MS)));
	try {
	  await gp.vibrationActuator.playEffect('dual-rumble', {
		duration: d, strongMagnitude: s, weakMagnitude: s
	  });
	} catch (e) { /* 一部ブラウザは未対応 */ }
  }
}
