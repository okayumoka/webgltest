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
		this.programList = [];
		this.mMatrix = null;
		this.vMatrix = null;
		this.pMatrix = null;
		this.mvpMatrix = null;
		this.uniLocation = null;

		this.initWebGL(canvas, width, height);
		// this.initShader();
		// this.initProgram();
		this.initPolygonProgram();
		this.initMatrix(this.programList.polygon);
		this.initTextureProgram();
		this.initMatrix(this.programList.texture);
		
		let gl = this.gl;

		// コンテキストの再描画
		this.flush();

		let mativ = this.mativ;

		this.triangleData = null;
		this.rectData = null;
		this.initTriangleData();
		this.initRectData();
		console.log(this.triangleData);
		console.log(this.rectData);

	}

	/**
	 * MVPマトリクスの初期化
	 */
	initMatrix(program) {
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
		mativ.lookAt([1, -1, 1], [1, -1, 0], [0, 1, 0], vMatrix);
		// プロジェクション座標変換行列
		mativ.perspective(90, canvas.width / canvas.height, 0.1, 100, pMatrix);
		// 各行列を掛け合わせ、座標変換行列を作成する（p * v * m を実施）
		mativ.multiply(pMatrix, vMatrix, mvpMatrix);
		mativ.multiply(mvpMatrix, mMatrix, mvpMatrix);

		// uniformLocationの取得
		// uniformLocationへ座標変換行列を登録
		this.gl.useProgram(program);
		let uniLocation = this.gl.getUniformLocation(program, 'mvpMatrix');
		this.gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

		this.mMatrix = mMatrix;
		this.vMatrix = vMatrix;
		this.pMatrix = pMatrix;
		this.mvpMatrix = mvpMatrix;
		this.uniLocation = uniLocation;
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
	 * ポリゴン用シェーダとプログラムの初期化
	 */
	initPolygonProgram() {
		let gl = this.gl;
		// 頂点（バーテックス）シェーダ
		let vShader = this.createShader(`
			attribute vec3 position;
			attribute vec4 color;
			uniform   mat4 mvpMatrix;
			varying   vec4 vColor;

			void main(void){
				vColor = color;
				gl_Position = mvpMatrix * vec4(position, 1.0);
			}
		`, 'vertex');
		// フラグメントシェーダ
		let fShader = this.createShader(`
			precision mediump float;
			varying vec4      vColor;
			void main(void){
				// 色設定
				gl_FragColor = vColor;
			}
		`, 'fragment');
		this.programList['polygon'] = this.createProgram(vShader, fShader);
	}

	/**
	 * テクスチャ用シェーダとプログラムの初期化
	 */
	initTextureProgram() {
		let gl = this.gl;
		// 頂点（バーテックス）シェーダ
		let vShader = this.createShader(`
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
		`, 'vertex');
		// フラグメントシェーダ
		let fShader = this.createShader(`
			precision mediump float;
			uniform sampler2D texture;
			varying vec4      vColor;
			varying vec2      vTextureCoord;
			void main(void){
				// 色設定
				vec4 smpColor = texture2D(texture, vTextureCoord);
				gl_FragColor  = vColor * smpColor;
			}
		`, 'fragment');
		this.programList['texture'] = this.createProgram(vShader, fShader);
	}

	createShader(src, type) {
		let gl = this.gl;
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

	createProgram(vShader, fShader) {
		let gl = this.gl;
		
		let program = gl.createProgram();
		
		// プログラムオブジェクトにシェーダ割り当て
		gl.attachShader(program, vShader);
		gl.attachShader(program, fShader);
		
		// シェーダをリンク
		gl.linkProgram(program);
		
		// シェーダのリンクが正しくできたかチェック
		if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
			// 成功
			// プログラムオブジェクトを有効にする
			gl.useProgram(program);
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
	 * VBO（頂点バッファオブジェクト）を生成する
	 * @param {Float32Array} data 頂点バッファに保持させる情報
	 */
	createVbo2(data) {
		let gl = this.gl;
		let vbo = gl.createBuffer();
	
		// バッファをバインド
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		// バッファにデータを設定
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
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
		// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
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
	 * @param {ProgramObj} program 設定先
	 */
	setAttribute(program, name, stride, vbo) {
		let gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	
		// attributeLocationの取得
		let location = gl.getAttribLocation(program, name);
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

	/**
	 * 三角形描画の準備
	 */
	initTriangleData() {
		let gl = this.gl;
		let program = this.programList.polygon;

		gl.useProgram(program);

		let vertexPos = this.exchangePos([
			0, 0, 0,
			32, 0, 0,
			0, 32, 0
		]);
		let vertexPosArray = new Float32Array(vertexPos);
		let vertexPosVbo = this.createVbo2(vertexPosArray);
		this.setAttribute(program, 'position', 3, vertexPosVbo);
		
		let vertexColor = this.exchangeColor([1,1,1]);
		let vertexColorArray = new Float32Array(vertexColor);
		let vertexColorVbo = this.createVbo2(vertexColorArray);
		this.setAttribute(program, 'color', 4, vertexColorVbo);
		
		this.triangleData = {
			vertexPos,
			vertexPosArray,
			vertexPosVbo,
			vertexColor,
			vertexColorArray,
			vertexColorVbo
		};
	}

	drawFillTriangle(x1, y1, x2, y2, x3, y3, color) {
		let gl = this.gl;
		let program = this.programList.polygon;
		let d = this.triangleData;

		gl.useProgram(program);

		let pos = d.vertexPosArray;
		x1 =   2 * x1 / this.canvas.width;
		y1 = -(2 * y1 / this.canvas.height);
		x2 =   2 * x2 / this.canvas.width;
		y2 = -(2 * y2 / this.canvas.height);
		x3 =   2 * x3 / this.canvas.width;
		y3 = -(2 * y3 / this.canvas.height);
		pos[0] = x1;
		pos[1] = y1;
		pos[2] = 0;
		pos[3] = x2;
		pos[4] = y2;
		pos[5] = 0;
		pos[6] = x3;
		pos[7] = y3;
		pos[8] = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, d.vertexPosVbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.vertexPosArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		color = this.exchangeColor(color, 3);
		let c = d.vertexColorArray;
		for (let i = 0; i < color.length; i++) {
			c[i] = color[i];
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, d.vertexColorVbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.vertexColorArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		this.setAttribute(program, 'position', 3, d.vertexPosVbo);
		this.setAttribute(program, 'color', 4, d.vertexColorVbo);
		
		// モデルの描画
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		
		// console.log(vertexPos);
		// console.log(vertexColor);
	}

	/**
	 * 四角形描画の初期化
	 */
	initRectData() {
		let gl = this.gl;
		let program = this.programList.polygon;
	
		gl.useProgram(program);
	
		let vertexPos = this.exchangePos([
			0, 0, 0,
			32, 0, 0,
			0, 32, 0,
			32, 32, 0
		], 4);
		let vertexPosArray = new Float32Array(vertexPos);
		let vertexPosVbo = this.createVbo2(vertexPosArray);

		let vertexColor = this.exchangeColor([1,1,1], 4);
		let vertexColorArray = new Float32Array(vertexColor);
		let vertexColorVbo = this.createVbo2(vertexColorArray);
	
		let index = [
			0, 1, 2,
			1, 2, 3
		];
		let ibo = this.createIbo(index);

		this.rectData = {
			vertexPos,
			vertexPosArray,
			vertexPosVbo,
			vertexColor,
			vertexColorArray,
			vertexColorVbo,
			index,
			ibo,
		}
	}

	/**
	 * 四角形の描画
	 */
	drawFillRect(x1, y1, x2, y2, color) {
		let gl = this.gl;
		let program = this.programList.polygon;
		let d = this.rectData;
		
		gl.useProgram(program);

		x1 = 2 * x1 / this.canvas.width;
		y1 = -(2 * y1 / this.canvas.height);
		x2 = 2 * x2 / this.canvas.width;
		y2 = -(2 * y2 / this.canvas.height);
		let pos = d.vertexPosArray;
		pos[0] = x1;
		pos[1] = y1;
		pos[2] = 0;
		pos[3] = x2;
		pos[4] = y1;
		pos[5] = 0;
		pos[6] = x1;
		pos[7] = y2;
		pos[8] = 0;
		pos[9] = x2;
		pos[10] = y2;
		pos[11] = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, d.vertexPosVbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.vertexPosArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		color = this.exchangeColor(color, 4);
		let c = d.vertexColorArray;
		for (let i = 0; i < color.length; i++) {
			c[i] = color[i];
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, d.vertexColorVbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.vertexColorArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		this.setAttribute(program, 'position', 3, d.vertexPosVbo);
		this.setAttribute(program, 'color', 4, d.vertexColorVbo);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, d.ibo);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
		// console.log(vertexPos);
		// console.log(vertexColor);
	}

	loadImage(image) {
		let gl = this.gl;
		let program = this.programList.texture;

		gl.useProgram(program);

		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);

		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);

		let textureCoord = [
			0, 0,
			1, 0,
			0, 1,
			1, 1
		];
		let textureCoordVbo = this.createVbo(textureCoord);

		let vertexPos = this.exchangePos([
			0, 0, 0,
			32, 0, 0,
			0, 32, 0,
			32, 32, 0
		], 4);
		let vertexPosArray = new Float32Array(vertexPos);
		let vertexPosVbo = this.createVbo2(vertexPosArray);

		let vertexColorVbo = this.createVbo([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]);

		let index = [
			0, 1, 2,
			1, 2, 3
		];
		let ibo = this.createIbo(index);

		return {
			image,
			width: image.width,
			height: image.height,
			tex,
			textureCoord,
			textureCoordVbo,
			vertexPos,
			vertexPosArray,
			vertexPosVbo,
			vertexColorVbo,
			index,
			ibo
		};
	}

	drawImage(x, y, imageData) {
		let gl = this.gl;
		let program = this.programList.texture;
		let d = imageData;

		gl.useProgram(program);

		// テクスチャ設定
		gl.bindTexture(gl.TEXTURE_2D, d.tex);
		gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);
		this.setAttribute(program, 'textureCoord', 2, d.textureCoordVbo);

		// 位置
		let x1 = 2 * x / this.canvas.width;
		let y1 = -(2 * y / this.canvas.height);
		let x2 = 2 * (x + d.image.width) / this.canvas.width;
		let y2 = -(2 * (y + d.image.height) / this.canvas.height);
		let pos = d.vertexPosArray;
		pos[0] = x1;
		pos[1] = y1;
		pos[2] = 0;
		pos[3] = x2;
		pos[4] = y1;
		pos[5] = 0;
		pos[6] = x1;
		pos[7] = y2;
		pos[8] = 0;
		pos[9] = x2;
		pos[10] = y2;
		pos[11] = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, d.vertexPosVbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.vertexPosArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		this.setAttribute(program, 'position', 3, d.vertexPosVbo);

		// 色
		this.setAttribute(program, 'color', 4, d.vertexColorVbo);

		// 描画
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, d.ibo);
		gl.drawElements(gl.TRIANGLES, d.index.length, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	drawImage2(x, y, image) {
		let gl = this.gl;
		let program = this.programList.texture;

		gl.useProgram(program);

		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D); // ミップマップ生成

		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);

		let textureCoord = [
			0, 0,
			1, 0,
			0, 1,
			1, 1
		];
		let textureCoordVbo = this.createVbo(textureCoord);
		this.setAttribute(program, 'textureCoord', 2, textureCoordVbo);

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
		this.setAttribute(program, 'position', 3, vertexPosVbo);

		let vertexColorVbo = this.createVbo([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]);
		this.setAttribute(program, 'color', 4, vertexColorVbo);

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

}


let canvas = document.getElementById('main-canvas');
let mygl = new MyGL(canvas, 600, 600);

// mygl.drawFillTriangle(0, 0, 300, 0, 0, 300, [1,0,0]);

// mygl.drawFillRect(10, 10, 300-10, 300-10, [1,1,0]);
// mygl.drawFillRect(100, 100, 200, 200, [1,0,0]);
// mygl.drawFillTriangle(150, 150, 300, 150, 150, 300, [1,0,0]);


let img = new Image();
img.onload = () => {
	let imageData = mygl.loadImage(img);
	setTimeout(() => {
		mygl.clear();
		let start = Date.now();
		mygl.drawFillTriangle(0, 0, 300, 0, 0, 300, [1,0,0]);
		mygl.drawFillRect(150, 150, 450, 450, [0,1,0]);
		for (let i = 0; i < 10000; i++) {
			mygl.drawImage((100+i) % 100, (100+i) % 100, imageData);
		}
		mygl.flush();
		let time = Date.now() - start;
		console.log('time=' + time);
	}, 1);
};
img.src = './image.jpg';

// let img = new Image();
// img.onload = () => {
// 	mygl.clear();
// 	// mygl.drawFillRect(10, 10, 300-10, 300-10, [1,1,0]);
// 	// mygl.drawImage(100, 100, img);
// 	// mygl.drawFillTriangle(150, 150, 300, 150, 150, 300, [0,1,0]);
// 	// mygl.flush();
// };
// img.src = './image.jpg';
//


