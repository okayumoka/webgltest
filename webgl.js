// webgj.js


class MyGL {

	/**
	 * コンストラクタ
	 */
	constructor(canvas, width, height) {
		this.width = width;
		this.height = height;
		this.canvas = canvas;
		this.gl = null;
		this.mativ = new matIV();

		this.vShader = null;
		this.fShader = null;
		this.program = null;
		this.mMatrix = null;
		this.vMatrix = null;
		this.pMatrix = null;
		this.mvpMatrix = null;
		this.uniLocation = null;

		this.initWebGL(canvas, width, height);
		this.initShader();
		this.initProgram();
		this.initMatrix();
		
		let gl = this.gl;

		// コンテキストの再描画
		this.flush();
	}

	initMatrix() {
		let mativ = this.mativ;

		// 行列ライブラリ初期化、行列生成
		let mMatrix = mativ.identity(mativ.create()); // モデル変換行列
		let vMatrix = mativ.identity(mativ.create()); // ビュー変換行列
		let pMatrix = mativ.identity(mativ.create()); // プロジェクション変換行列
		let mvpMatrix = mativ.identity(mativ.create()); // 最終座標変換行列（m * v * p）
		// モデル変換行列
		mativ.translate(mMatrix, [0.0, 0.0, 0.0], mMatrix);
		// ビュー座標変換行列（原点から上に1.0、後ろに3.0移動し、原点を注視点として見ている状態）
		// mativ.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
		// mativ.lookAt([0.0, 0.0, 1.0], [0, 0, 0], [0, 1, 0], vMatrix);
		mativ.lookAt([1, -1, 1], [1, -1, 0], [0, 1, 0], vMatrix);
		// プロジェクション座標変換行列
		mativ.perspective(90, canvas.width / canvas.height, 0.1, 100, pMatrix);
		// 各行列を掛け合わせ、座標変換行列を作成する（p * v * m を実施）
		mativ.multiply(pMatrix, vMatrix, mvpMatrix);
		mativ.multiply(mvpMatrix, mMatrix, mvpMatrix);

		// uniformLocationの取得
		let uniLocation = this.gl.getUniformLocation(this.program, 'mvpMatrix');
		// uniformLocationへ座標変換行列を登録
		this.gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

		this.mMatrix = mMatrix;
		this.vMatrix = vMatrix;
		this.pMatrix = pMatrix;
		this.mvpMatrix = mvpMatrix;
		this.uniLocation = uniLocation;
	}

	drawFillTriangle(x1, y1, x2, y2, x3, y3, color) {
		let gl = this.gl;
		let vertexPos = this.exchangePos([
			x1, y1, 0,
			x2, y2, 0,
			x3, y3, 0
		]);
		let vertexPosVbo = this.createVbo(vertexPos);
		this.setAttribute('position', 3, vertexPosVbo);
		
		let vertexColor = this.exchangeColor(color);
		let vertexColorVbo = this.createVbo(vertexColor);
		this.setAttribute('color', 4, vertexColorVbo);
		
		// モデルの描画
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		
		// console.log(vertexPos);
		// console.log(vertexColor);
	}

	drawFillRect(x1, y1, x2, y2, color) {
		let gl = this.gl;

		let vertexPos = this.exchangePos([
			x1, y1, 0,
			x2, y1, 0,
			x1, y2, 0,
			x2, y2, 0
		], 4);
		let vertexPosVbo = this.createVbo(vertexPos);
		this.setAttribute('position', 3, vertexPosVbo);

		let vertexColor = this.exchangeColor(color, 4);
		let vertexColorVbo = this.createVbo(vertexColor);
		this.setAttribute('color', 4, vertexColorVbo);

		let index = [
			0, 1, 2,
			1, 2, 3
		];
		let ibo = this.createIbo(index);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// console.log(vertexPos);
		// console.log(vertexColor);
	}

	drawImage(x, y, image) {
		let gl = this.gl;

		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D); // ミップマップ生成

		let uniLocation = this.gl.getUniformLocation(this.program, 'texture');
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.uniform1i(uniLocation, 0);


		let textureCoord = [
			0, 0,
			1, 0,
			0, 1,
			1, 1
		];
		let textureCoordVbo = this.createVbo(textureCoord);
		this.setAttribute('textureCoord', 2, textureCoordVbo);

		let w = image.width;
		let h = image.height;
		let x1 = x;
		let x2 = x + w;
		let y1 = y;
		let y2 = y + h;

		let vertexPos = this.exchangePos([
			x1, y1, 0,
			x2, y1, 0,
			x1, y2, 0,
			x2, y2, 0
		], 4);
		let vertexPosVbo = this.createVbo(vertexPos);
		this.setAttribute('position', 3, vertexPosVbo);

		let vertexColorVbo = this.createVbo([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]);
		this.setAttribute('color', 4, vertexColorVbo);

		let index = [
			0, 1, 2,
			1, 2, 3
		];
		let ibo = this.createIbo(index);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// console.log('draw image. image.src=' + image.src);
		// console.log(vertexPos);
	}

	exchangePos(pos, count = 3) {
		let w = 2 / this.canvas.width;
		let h = -2 / this.canvas.height;
		if (count === 3) {
			return [
				pos[0]*w, pos[1]*h, pos[2],
				pos[3]*w, pos[4]*h, pos[5],
				pos[6]*w, pos[7]*h, pos[8],
			];
		} else {
			return [
				pos[0]*w, pos[1]*h, pos[2],
				pos[3]*w, pos[4]*h, pos[5],
				pos[6]*w, pos[7]*h, pos[8],
				pos[9]*w, pos[10]*h, pos[11]
			];
		}
	}

	exchangeColor(color, count = 3) {
		if (color.length === 3) {
			color = [color[0], color[1], color[2], 1];
		}
		
		if (color.length !== 4) {
			throw new Error(`drawFillTriangle 色配列の不正(${color.join(',')})`);
		}

		if (count === 3) {
			return [
				color[0], color[1], color[2], color[3],
				color[0], color[1], color[2], color[3],
				color[0], color[1], color[2], color[3]
			];
		} else {
			return [
				color[0], color[1], color[2], color[3],
				color[0], color[1], color[2], color[3],
				color[0], color[1], color[2], color[3],
				color[0], color[1], color[2], color[3]
			];
		}
	}

	/**
	 * WebGL関連の初期化
	 * @param {Canvas} canvas キャンバス
	 * @param {Number} width キャンバスの幅
	 * @param {Number} height キャンバスの高さ
	 */
	initWebGL(canvas, width, height) {
		canvas.width = width;
		canvas.height = height;
		// コンテキスト取得
		let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		this.gl = gl;
		// 初期化色の設定
		gl.clearColor(0, 0, 0, 1.0); // R,G,B,A
		// 初期化の深度を設定
		gl.clearDepth(1.0);
		// テクスチャを有効に
		gl.activeTexture(gl.TEXTURE0);
		// 初期化
		this.clear();
	}

	/**
	 * シェーダの初期化
	 */
	initShader() {
		// 頂点（バーテックス）シェーダ
		let vSource = `
			attribute vec3 position;
			attribute vec4 color;
			attribute vec2 textureCoord;
			uniform   mat4 mvpMatrix;
			varying   vec4 vColor;
			varying   vec2 vTextureCoord;

			void main(void){
				vColor = color;
				vTextureCoord = textureCoord;
				gl_Position = mvpMatrix * vec4(position, 1.0);
			}
		`;
		// フラグメントシェーダ
		let fSource = `
			precision mediump float;
			uniform sampler2D texture;
			varying vec4      vColor;
			varying vec2      vTextureCoord;
			void main(void){
				// 色設定
				// gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
				// gl_FragColor = vColor;
				vec4 smpColor = texture2D(texture, vTextureCoord);
				gl_FragColor  = vColor * smpColor;
			}
		`;
		let gl = this.gl;
		
		// シェーダをコンパイルして生成
		let createShader = function (src, type) {
			let shader;
			if (type === 'vertex') {
				shader = gl.createShader(gl.VERTEX_SHADER);
			} else if (type === 'fragment') {
				shader = gl.createShader(gl.FRAGMENT_SHADER);
			} else {
				throw new Error(`createShader, シェーダのタイプが不正 (${type})`);
			}
			// 生成されたシェーダにソースを割り当てる
			gl.shaderSource(shader, src);
			// シェーダをコンパイルする
			gl.compileShader(shader);
			// シェーダが正しくコンパイルされたかチェック
			if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				// 成功していたらシェーダを返して終了
				return shader;
			} else {
				// 失敗していたらエラーログをアラートする
				let log = gl.getShaderInfoLog(shader);
				console.log(type + ' : ' + log);
				throw new Error(log);
			}
		}
		let vShader = createShader(vSource, 'vertex');
		let fShader = createShader(fSource, 'fragment');
		this.vShader = vShader;
		this.fShader = fShader;
	}

	/**
	 * プログラムオブジェクトの初期化
	 */
	initProgram() {
		let gl = this.gl;
		// プログラムオブジェクトを生成
		let program = gl.createProgram();
	
		// プログラムオブジェクトにシェーダ割り当て
		gl.attachShader(program, this.vShader);
		gl.attachShader(program, this.fShader);
	
		// シェーダをリンク
		gl.linkProgram(program);
	
		// シェーダのリンクが正しくできたかチェック
		if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
			// 成功
			// プログラムオブジェクトを有効にする
			gl.useProgram(program);
			this.program = program;
			return program;
		} else {
			let log = (gl.getProgramInfoLog(program));
			console.log(log);
			throw new Error(log);
		}
	}

	/**
	 * VBO（頂点バッファオブジェクト）を生成する
	 * @param {Array} data 頂点バッファに保持させる情報
	 */
	createVbo(data) {
		let gl = this.gl;
		let vbo = gl.createBuffer();
	
		// バッファをバインド
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		// バッファにデータを設定
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
		return vbo;
	}

	/**
	 * IBO（インデックスバッファオブジェクト）を生成する
	 * @param {Array} data インデックスバッファの値
	 */
	createIbo(data) {
		let gl = this.gl;
		var ibo = gl.createBuffer();

		// バッファをバインドする
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		// バッファにデータをセット
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		return ibo;
	}

	/**
	 * GLオブジェクトにAttributeを設定する
	 * @param {String} name Attribute名
	 * @param {Number} stride 変数の要素数
	 * @param {VBO} vbo 設定するVBO
	 */
	setAttribute(name, stride, vbo) {
		let gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	
		// attributeLocationの取得
		let location = gl.getAttribLocation(this.program, name);
		// attributeを有効にする
		gl.enableVertexAttribArray(location);
		// VBOを登録
		gl.vertexAttribPointer(location, stride, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	/**
	 * 描画をクリアする
	 */
	clear() {
		let gl = this.gl;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	/**
	 * コンテキストの再描画
	 */
	flush() {
		this.gl.flush();
	}
}


let canvas = document.getElementById('main-canvas');
let mygl = new MyGL(canvas, 600, 600);

// mygl.drawFillTriangle(0, 0, 300, 0, 0, 300, [1,0,0]);

// mygl.drawFillRect(10, 10, 300-10, 300-10, [1,1,0]);
// mygl.drawFillRect(100, 100, 200, 200, [1,0,0]);
// mygl.drawFillTriangle(150, 150, 300, 150, 150, 300, [1,0,0]);

let img = new Image();
img.onload = () => {
	mygl.clear();
	mygl.drawFillRect(10, 10, 300-10, 300-10, [1,1,0]);
	mygl.drawFillRect(100, 100, 200, 200, [1,0,0]);
	mygl.drawImage(0, 0, img);
	mygl.drawImage(100, 100, img);
	mygl.flush();
};
img.src = './image.jpg';




