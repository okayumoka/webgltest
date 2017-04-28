// webgj.js

//---------------------------------------------------------
// canvasの初期化、コンテキスト取得など
//---------------------------------------------------------
let width = 300;
let height = 300;
let canvas = document.getElementById('main-canvas');
canvas.width = width;
canvas.height = height;

let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');


//---------------------------------------------------------
// webglの初期化
//---------------------------------------------------------

// 初期化色の設定
gl.clearColor(0, 0, 0, 1.0); // R,G,B,A
// 初期化の深度を設定
gl.clearDepth(1.0);
// 初期化
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


//---------------------------------------------------------
// シェーダの生成
//---------------------------------------------------------

// 頂点（バーテックス）シェーダ
let vSource = `
attribute vec3 position;
attribute vec4 color;
uniform   mat4 mvpMatrix;
varying   vec4 vColor;

void main(void){
    vColor = color;
    gl_Position = mvpMatrix * vec4(position, 1.0);
}
`;

// フラグメントシェーダ
let fSource = `
precision mediump float;
varying   vec4 vColor;

void main(void){
	// 色設定
    // gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    gl_FragColor = vColor;
}
`;

// シェーダをコンパイルして生成
let vShader = createShader(vSource, 'vertex');
let fShader = createShader(fSource, 'fragment');


//---------------------------------------------------------
// プログラムオブジェクトの生成
//---------------------------------------------------------

// プログラムオブジェクトを生成
let program = createProgram(vShader, fShader);


//---------------------------------------------------------
// 頂点データの生成と、シェーダへの引き渡し
//---------------------------------------------------------

// モデル（頂点）データ
let vertexPosition = [
	// x, y, z
	 0.0,  1.0,  0.0,
	 1.0,  0.0,  0.0,
	-1.0,  0.0,  0.0,
];
// 頂点バッファ（頂点情報）を生成
let posVbo = createVbo(vertexPosition);
// VBOをバインド
gl.bindBuffer(gl.ARRAY_BUFFER, posVbo);
// // attributeLocationの取得
// let attLocation = gl.getAttribLocation(program, 'position');
// // attributeの要素数（この場合は xyz の3要素）
// let attStride = 3;
// // attribute属性[position]を有効にする
// gl.enableVertexAttribArray(attLocation);
// // attribute属性[position]に頂点情報のVBOを登録
// gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);
// // バインド解除
// gl.bindBuffer(gl.ARRAY_BUFFER, null);
setAttribute(program, 'position', 3, posVbo);


//---------------------------------------------------------
// 頂点色データの生成と、シェーダへの引き渡し
//---------------------------------------------------------

// 頂点色データ
let vertexColor = [
	1.0, 0.0, 0.0, 1.0,
	0.0, 1.0, 0.0, 1.0,
	0.0, 0.0, 1.0, 1.0
];
let colorVbo = createVbo(vertexColor);
// gl.bindBuffer(gl.ARRAY_BUFFER, colorVbo);
// let colorAttrLocation = gl.getAttribLocation(program, 'color');
// let colorAttrStride = 4;
// gl.enableVertexAttribArray(colorAttrLocation);
// gl.vertexAttribPointer(colorAttrLocation, colorAttrStride, gl.FLOAT, false, 0, 0);
// gl.bindBuffer(gl.ARRAY_BUFFER, null);
setAttribute(program, 'color', 4, colorVbo);


//---------------------------------------------------------
// 座標変換行列の生成と描画
//---------------------------------------------------------

// 行列ライブラリ初期化、行列生成
let mativ = new matIV();
let mMatrix = mativ.identity(mativ.create()); // モデル変換行列
let vMatrix = mativ.identity(mativ.create()); // ビュー変換行列
let pMatrix = mativ.identity(mativ.create()); // プロジェクション変換行列
let mvpMatrix = mativ.identity(mativ.create()); // 最終座標変換行列（m * v * p）
// モデル変換行列
mativ.translate(mMatrix, [0.0, 0.0, 0.0], mMatrix);
// ビュー座標変換行列（原点から上に1.0、後ろに3.0移動し、原点を注視点として見ている状態）
// mativ.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
mativ.lookAt([0.0, 0.0, 1.0], [0, 0, 0], [0, 1, 0], vMatrix);
// プロジェクション座標変換行列
mativ.perspective(90, canvas.width / canvas.height, 0.1, 100, pMatrix);
// 各行列を掛け合わせ、座標変換行列を作成する（p * v * m を実施）
mativ.multiply(pMatrix, vMatrix, mvpMatrix);
mativ.multiply(mvpMatrix, mMatrix, mvpMatrix);

// uniformLocationの取得
let uniLocation = gl.getUniformLocation(program, 'mvpMatrix');
// uniformLocationへ座標変換行列を登録
gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
// モデルの描画
gl.drawArrays(gl.TRIANGLES, 0, 3);
// コンテキストの再描画
gl.flush();




function createShader(src, type) {
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
		console.log(log);
		throw new Error(log);
	}
}

function createProgram(vShader, fShader) {
	// プログラムオブジェクト生成
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
function createVbo(data) {
	let vbo = gl.createBuffer();

	// バッファをバインド
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	// バッファにデータを設定
	let floatArray = new Float32Array(data);
	gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
	// バッファのバインドを無効化
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return vbo;
}

function setAttribute(program, name, stride, vbo) {
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

	// attributeLocationの取得
	let location = gl.getAttribLocation(program, name);
	// attributeを有効にする
	gl.enableVertexAttribArray(location);
	// VBOを登録
	gl.vertexAttribPointer(location, stride, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}



