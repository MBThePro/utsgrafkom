var GL;
class MyObject {
	object_vertex = [];
	OBJECT_VERTEX = GL.createBuffer();
	object_faces = [];
	OBJECT_FACES = GL.createBuffer();
	shader_vertex_source;
	shader_fragment_source;
	parent = null;
	line = false;
	child = [];

compile_shader = function (source, type, typeString) {
		var shader = GL.createShader(type);
		GL.shaderSource(shader, source);
		GL.compileShader(shader);
		if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
			alert(
				"ERROR IN" + typeString + " SHADER: " + GL.getShaderInfoLog(shader)
			);
			return false;
		}
		return shader;
	};

	shader_vertex;
	shader_fragment;
	SHADER_PROGRAM;
	_Pmatrix;
	_Vmatrix;
	_Mmatrix;
	_color;
	_position;

	MOVEMATRIX = LIBS.get_I4();

	constructor(
		object_vertex,
		object_faces,
		shader_vertex_source,
		shader_fragment_source
	) {
		this.object_vertex = object_vertex;
		this.object_faces = object_faces;
		this.shader_vertex_source = shader_vertex_source;
		this.shader_fragment_source = shader_fragment_source;

		this.shader_vertex = this.compile_shader(
			this.shader_vertex_source,
			GL.VERTEX_SHADER,
			"VERTEX"
		);
		this.shader_fragment = this.compile_shader(
			this.shader_fragment_source,
			GL.FRAGMENT_SHADER,
			"FRAGMENT"
		);

		this.SHADER_PROGRAM = GL.createProgram();
		GL.attachShader(this.SHADER_PROGRAM, this.shader_vertex);
		GL.attachShader(this.SHADER_PROGRAM, this.shader_fragment);

		GL.linkProgram(this.SHADER_PROGRAM);

		this._Pmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Pmatrix");
		this._Vmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Vmatrix");
		this._Mmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Mmatrix");

		this._color = GL.getAttribLocation(this.SHADER_PROGRAM, "color");
		this._position = GL.getAttribLocation(this.SHADER_PROGRAM, "position");

		GL.enableVertexAttribArray(this._color);
		GL.enableVertexAttribArray(this._position);

		GL.useProgram(this.SHADER_PROGRAM);

		this.initializeBuffer();
	}

	initializeBuffer() {
		GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
		GL.bufferData(
			GL.ARRAY_BUFFER,
			new Float32Array(this.object_vertex),
			GL.STATIC_DRAW
		);
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
		GL.bufferData(
			GL.ELEMENT_ARRAY_BUFFER,
			new Uint16Array(this.object_faces),
			GL.STATIC_DRAW
		);
	}

	setuniformmatrix4(PROJMATRIX, VIEWMATRIX) {
		GL.useProgram(this.SHADER_PROGRAM);
		GL.uniformMatrix4fv(this._Pmatrix, false, PROJMATRIX);
		GL.uniformMatrix4fv(this._Vmatrix, false, VIEWMATRIX);
		GL.uniformMatrix4fv(this._Mmatrix, false, this.MOVEMATRIX);

		// Set uniform matrices for child objects recursively
		for (let i = 0; i < this.child.length; i++) {
			this.child[i].setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		}
	}

	draw() {
		GL.useProgram(this.SHADER_PROGRAM);
		GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
		GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
		GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
		GL.drawElements(
			GL.TRIANGLE_FAN,
			this.object_faces.length,
			GL.UNSIGNED_SHORT,
			0
		);
		for (let i = 0; i < this.child.length; i++) {
			let child = this.child[i];
			if (child.line == false) child.draw();
			else child.drawLine();
		}
	}
	drawLine() {
		GL.useProgram(this.SHADER_PROGRAM);
		GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
		GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
		GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
		GL.drawElements(GL.LINES, this.object_faces.length, GL.UNSIGNED_SHORT, 0);
		for (let i = 0; i < this.child.length; i++) {
			let child = this.child[i];
			if (child.line == false) child.draw();
			else child.drawLine();
		}
	}
	setRotateMove(PHI, THETA, r) {
		LIBS.rotateX(this.MOVEMATRIX, PHI);
		LIBS.rotateY(this.MOVEMATRIX, THETA);
		LIBS.rotateZ(this.MOVEMATRIX, r);
	}

	setTranslateMove(x, y, z) {
		LIBS.translateX(this.MOVEMATRIX, x);
		LIBS.translateY(this.MOVEMATRIX, y);
		LIBS.translateZ(this.MOVEMATRIX, z);
	}

	setIdentityMove() {
		LIBS.set_I4(this.MOVEMATRIX);
	}
	addChild(child) {
		child.parent = this;
		this.child.push(child);
	}
	changeline(isTrue) {
		if (isTrue == true) {
			this.line = true;
		} else {
			this.line = false;
		}
	}
	hasParent() {
		return this.parent !== null && this.parent !== undefined;
	}
	moveChildrenWithParent(x, y, z) {
		if (this.parent === null || !this.hasParent()) {
			this.setTranslateMove(x, y, z);
		}
		for (var i = 0; i < this.child.length; i++) {
			let child = this.child[i];
			child.setTranslateMove(x, y, z);
			if (child.child.length > 0) {
				child.moveChildrenWithParent(x, y, z);
			}
		}
	}
	setPosition(x1, y1, z1, x2, y2, z2, PHI, THETA) {
		this.setIdentityMove();
		this.setIdentityMove();
		var temps = LIBS.get_I4();
		this.setRotateMove(x1, y1, z1);
		this.setTranslateMove(x2, y2, z2);
		LIBS.rotateX(temps, PHI);
		this.MOVEMATRIX = LIBS.multiply(this.MOVEMATRIX, temps);

		LIBS.rotateY(temps, THETA);
		this.MOVEMATRIX = LIBS.multiply(this.MOVEMATRIX, temps);
	}
}

function sphereVertex(
	stackCount,
	sectorCount,
	radiusX,
	radiusY,
	radiusZ,
	r,
	g,
	b
) {
	// sectorcount = jumlah segitiga nya ngelingkari
	// stackcount = berapa kali segitiga itu distack
	object_vertex = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radiusX * cosPhi * sinTheta;
			var y = radiusY * cosTheta;
			var z = radiusZ * sinPhi * sinTheta;

			object_vertex.push(x, y, z, r, g, b);
		}
	}
	return object_vertex;
}
function halfsphereVertex(
	stackCount,
	sectorCount,
	radiusX,
	radiusY,
	radiusZ,
	r,
	g,
	b
) {
	// sectorcount = jumlah segitiga nya ngelingkari
	// stackcount = berapa kali segitiga itu distack
	object_vertex = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radiusX * cosPhi * sinTheta;
			var y = radiusY * cosTheta;
			var z = radiusZ * sinPhi * sinTheta;

			if (y <= 0.4) {
				object_vertex.push(x, y, z, r, g, b);
			}
		}
	}
	return object_vertex;
}
function sphereFaces(stackCount, sectorCount) {
	object_faces = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces.push(k1, k2, k3);
			object_faces.push(k2, k4, k3);
		}
	}
	return object_faces;
}

function tubeVertex(outerRad, innerRad, height, sectorCount, r, g, b) {
	object_vertex = [];
	object_vertex.push(0, 0, 0, r, g, b);
	object_vertex.push(0, 0, height, r, g, b);
	var angleIncrement = (2 * Math.PI) / sectorCount;
	for (var i = 0; i <= sectorCount; i++) {
		var angle = i * angleIncrement;
		var cosAngle = Math.cos(angle);
		var sinAngle = Math.sin(angle);
		var bottomX = outerRad * cosAngle;
		var bottomY = outerRad * sinAngle;
		var bottomZ = 0;
		object_vertex.push(bottomX, bottomY, bottomZ, r, g, b);
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height;
		object_vertex.push(topX, topY, topZ, r, g, b);
	}
	return object_vertex;
}
function tubeFaces(sectorCount) {
	object_faces = [];
	for (var i = 0; i < sectorCount; i++) {
		var index = i * 2 + 2;
		object_faces.push(index, index + 2, 0); // Bottom face offset +0 dan +2
		object_faces.push(index + 1, 1, index + 3); // Top face offset +1 dan +3
		object_faces.push(index, index + 1, index + 3, index, index + 3, index + 2); // Side faces dioffset agar tidak bertabrakan
	}
	object_faces.push(2, sectorCount * 2 + 2, 0); // Bottom circle
	object_faces.push(1, sectorCount * 2 + 3, 3); // Top circle
	return this.object_faces;
}
function main() {
	var CANVAS = document.getElementById("mycanvas");

	CANVAS.width = window.innerWidth;
	CANVAS.height = window.innerHeight;

	var THETA = 0;
	var PHI = 0; 
	var dX = 0; 
	var dY = 0; 
	var AMORTIZATION = 0.95; 
	var drag = false;
	var x_prev, y_prev;
var mouseDown = function (e) {
		drag = true;
		x_prev = e.pageX;
		y_prev = e.pageY;
		e.preventDefault();
		return false;
	};

var mouseUp = function (e) {
		drag = false;
	};

var mouseMove = function (e) {
		if (drag == false) {
			return false;
		}
		dX = ((e.pageX - x_prev) * 2 * Math.PI) / CANVAS.width;
		dY = ((e.pageY - y_prev) * 2 * Math.PI) / CANVAS.height;
		THETA += dX;
		PHI += dY;

		x_prev = e.pageX;
		y_prev = e.pageY;
		e.preventDefault();
	};

	CANVAS.addEventListener("mousedown", mouseDown, false);
	CANVAS.addEventListener("mouseup", mouseUp, false);
	CANVAS.addEventListener("mouseout", mouseUp, false);
	CANVAS.addEventListener("mousemove", mouseMove, false);

	try {
		GL = CANVAS.getContext("webgl", { antialias: true });
	} catch (error) {
		alert("webGL context cannot be initialized");
		return false;
	}
	//shaders
	var shader_vertex_source = `
    attribute vec3 position;
    attribute vec3 color;

    uniform mat4 Pmatrix;
    uniform mat4 Vmatrix;
    uniform mat4 Mmatrix;


    varying vec3 vColor;
    void main(void){
    gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position,1.0);
    vColor =color;
    }`;

	var shader_fragment_source = `
    precision mediump float;
    varying vec3 vColor;
    void main(void){
        gl_FragColor =vec4(vColor,1.0);
    }`;

	//head
	object_vertex0 = sphereVertex(100, 700, 1.2, 1.2, 1.2, 0.984, 0.882, 0.788);
	object_faces0 = sphereFaces(100, 700);

	//body
	object_vertex1 = [];
	outerRad = 1;
	innerRad = 0.5;
	height = 1.5;
	segments = 100;

	var angleIncrement = (2 * Math.PI) / segments;
	for (var i = 0; i <= segments; i++) {
		var angle = i * angleIncrement;
		var cosAngle = Math.cos(angle);
		var sinAngle = Math.sin(angle);

		var bottomX = outerRad * cosAngle;
		var bottomY = outerRad * sinAngle;
		var bottomZ = 0;
		object_vertex1.push(bottomX, bottomY, bottomZ, 1.0, 0.428, 0.182);

		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height;
		if (i == 75) object_vertex1.push(topX, topY, topZ, 0, 0, 0);
		else object_vertex1.push(topX, topY, topZ, 1.0, 0.428, 0.182);
	}
	object_faces1 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces1.push(index, index + 2, 0);
		object_faces1.push(index + 1, 1, index + 3);
		object_faces1.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		);
	}
	object_faces1.push(2, segments * 2 + 2, 0);
	object_faces1.push(1, segments * 2 + 3, 3);

	//left_arm & right_arm
	object_vertex2 = tubeVertex(0.2, 0.2, 0.5, 100, 0.886, 0.321, 0.204);
	object_faces2 = tubeFaces(100);

	//left & right forearm
	object_vertex3 = tubeVertex(0.2, 0.2, 0.5, 800, 0.886, 0.321, 0.204);
	object_faces3 = tubeFaces(800);

	//left&right elbow
	object_vertex4 = sphereVertex(50, 50, 0.2, 0.2, 0.2, 0.886, 0.321, 0.204);
	object_faces4 = sphereFaces(50, 50);

	//left&right hands
	object_vertex5 = sphereVertex(
		100,
		100,
		0.2,
		0.2,
		0.25,
		0.4902,
		0.8157,
		0.5176
	);
	object_faces5 = sphereFaces(100, 100);

	//left & right thumb
	object_vertex6 = tubeVertex(0.1, 0.08, 0.14, 4, 0.4412, 0.7348, 0.4658);
	object_faces6 = tubeFaces(4);

	//left & right leg
	object_vertex7 = tubeVertex(0.6, 0.6, 0.3, 200, 0.1216, 0.2784, 0.2471);
	object_faces7 = tubeFaces(200);

	//left & right shoe
	object_vertex8 = sphereVertex(100, 100, 0.62, 0.75, 0.15, 0, 0, 0);
	object_faces8 = sphereFaces(100, 100);

	//left&right eye
	object_vertex9 = sphereVertex(100, 100, 0.3, 0.4, 0.2, 255, 255, 255);
	object_faces9 = sphereFaces(100, 100);

	//left&right blackeye
	object_vertex10 = sphereVertex(100, 100, 0.06, 0.06, 0.05, 0, 0, 0);
	object_faces10 = sphereFaces(100, 100);

	//mouth
	var segments = 20;
	var radius = 0.2;
	var heightFactor = 0.13;
	var object_vertex11 = [];
	for (var i = 0; i <= segments; i++) {
		var angle = (Math.PI * i) / segments;
		var x = radius * Math.cos(angle);
		var y = heightFactor * radius * Math.sin(angle);
		object_vertex11.push(x, y, 0, 0, 0, 0);
	}
	var object_faces11 = [];
	for (var i = 0; i < segments; ++i) {
		var k1 = i;
		var k2 = i + 1;
		object_faces11.push(k1, k2);
	}

	//hat_top
	object_vertex12 = tubeVertex(1.25, 1.25, 1, 800, 0.4902, 0.8157, 0.5176);
	object_faces12 = tubeFaces(800);

	//hat_middle
	object_vertex13 = tubeVertex(1.25, 1.25, 0.5, 800, 0.4412, 0.7348, 0.4658);
	object_faces13 = tubeFaces(800);

	//left&right hat
	object_vertex14 = halfsphereVertex(
		100,
		100,
		0.8,
		1,
		0.2,
		0.4902,
		0.8157,
		0.5176
	);
	object_faces14 = sphereFaces(100, 100);

	//back hat
	object_vertex15 = halfsphereVertex(
		100,
		800,
		1.3,
		1.7,
		0.4,
		0.4902,
		0.8157,
		0.5176
	);
	object_faces15 = sphereFaces(100, 800);

	//pocket

	//triangle
	object_vertex16 = [];
	outerRad = 0.2;
	innerRad = 0.2; //
	height = 0.08;
	segments = 3;
	object_vertex16.push(0, 0, 0, 1.0, 0.428, 0.182); // Center vertex for bottom circle
	object_vertex16.push(0, 0, height, 0, 0, 0); // Center vertex for top circle
	var angleIncrement = (2 * Math.PI) / segments;
	for (var i = 0; i <= segments; i++) {
		// Change the condition to <= to include the last segment
		var angle = i * angleIncrement;
		var cosAngle = Math.cos(angle);
		var sinAngle = Math.sin(angle);

		// Bottom circle vertex
		var bottomX = outerRad * cosAngle;
		var bottomY = outerRad * sinAngle;
		var bottomZ = 0; // For the bottom circle
		object_vertex16.push(bottomX, bottomY, bottomZ, 1.0, 0.428, 0.182);
		// object_vertex16.push(bottomX, bottomY, bottomZ, 0, 0, 0);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex16.push(topX, topY, topZ, 0, 0, 0);
	}
	object_faces16 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces16.push(index, index + 2, 0); // Bottom face
		object_faces16.push(index + 1, 1, index + 3); // Top face
		object_faces16.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces16.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces16.push(1, segments * 2 + 3, 3); // Top circle

	//square
	object_vertex17 = [
		-0.2, -0.3, 0, 0, 0, 0, 0.2, -0.3, 0, 0, 0, 0, 0.2, 0.2, 0, 0, 0, 0, -0.2,
		0.2, 0, 0, 0, 0,
	];
	object_faces17 = [0, 1, 1, 2, 2, 3, 3, 0];

	//back_sweater
	object_vertex18 = tubeVertex(0.75, 0.75, 0.5, 800, 0.1216, 0.2784, 0.2471);
	object_faces18 = tubeFaces(800);

	//front_sweater
	object_vertex19 = sphereVertex(
		100,
		100,
		0.4,
		0.25,
		0.1,
		0.1216,
		0.2784,
		0.2471
	);
	object_faces19 = sphereFaces(100, 100);

	var head = new MyObject(
		object_vertex0,
		object_faces0,
		shader_vertex_source,
		shader_fragment_source
	);
	var body = new MyObject(
		object_vertex1,
		object_faces1,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_arm = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_arm = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_forearm = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_forearm = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_elbow = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_elbow = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_hand = new MyObject(
		object_vertex5,
		object_faces5,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_hand = new MyObject(
		object_vertex5,
		object_faces5,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_thumb = new MyObject(
		object_vertex6,
		object_faces6,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_thumb = new MyObject(
		object_vertex6,
		object_faces6,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_leg = new MyObject(
		object_vertex7,
		object_faces7,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_leg = new MyObject(
		object_vertex7,
		object_faces7,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_shoe = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_shoe = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_eye = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_eye = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_blackeye = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_blackeye = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);
	var mouth = new MyObject(
		object_vertex11,
		object_faces11,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_top = new MyObject(
		object_vertex12,
		object_faces12,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_middle = new MyObject(
		object_vertex13,
		object_faces13,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_left = new MyObject(
		object_vertex14,
		object_faces14,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_right = new MyObject(
		object_vertex14,
		object_faces14,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_back = new MyObject(
		object_vertex15,
		object_faces15,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_triangle_left = new MyObject(
		object_vertex16,
		object_faces16,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_square_left = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_triangle_right = new MyObject(
		object_vertex16,
		object_faces16,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_square_right = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var back_sweater = new MyObject(
		object_vertex18,
		object_faces18,
		shader_vertex_source,
		shader_fragment_source
	);
	var front_sweater_left = new MyObject(
		object_vertex19,
		object_faces19,
		shader_vertex_source,
		shader_fragment_source
	);
	var front_sweater_right = new MyObject(
		object_vertex19,
		object_faces19,
		shader_vertex_source,
		shader_fragment_source
	);

	//body
	body.addChild(left_arm);
	body.addChild(right_arm);
	body.addChild(left_forearm);
	body.addChild(right_forearm);
	left_forearm.addChild(left_elbow);
	right_forearm.addChild(right_elbow);
	left_forearm.addChild(left_hand);
	right_forearm.addChild(right_hand);
	left_hand.addChild(left_thumb);
	right_hand.addChild(right_thumb);
	body.addChild(left_leg);
	body.addChild(right_leg);
	left_leg.addChild(left_shoe);
	right_leg.addChild(right_shoe);
	body.addChild(pocket_triangle_left);
	body.addChild(pocket_triangle_right);
	body.addChild(pocket_square_left);
	body.addChild(pocket_square_right);
	body.addChild(back_sweater);

	//head
	head.addChild(hat_top);
	head.addChild(hat_middle);
	head.addChild(hat_left);
	head.addChild(hat_right);
	head.addChild(hat_back);
	head.addChild(left_eye);
	head.addChild(right_eye);
	head.addChild(left_blackeye);
	head.addChild(right_blackeye);
	head.addChild(mouth);

	//sweater
	back_sweater.addChild(front_sweater_left);
	back_sweater.addChild(front_sweater_right);

	//MAtrix
	var PROJMATRIX = LIBS.get_projection(
		40,
		CANVAS.width / CANVAS.height,
		1,
		100
	);
	var VIEWMATRIX = LIBS.get_I4();

	LIBS.translateZ(VIEWMATRIX, -10);


	//setPosition
	function setAllPosition(){
	head.setPosition(0, 0, 0, 0, 0, 0, PHI, THETA);
		//left_eye
		left_eye.setPosition(Math.PI / 2, 0.3, 0, -0.3, -1.2, 0.2, PHI, THETA);

		//right_eye
		right_eye.setPosition(Math.PI / 2, -0.3, 0, 0.3, -1.2, 0.2, PHI, THETA);

		//left_blackeye
		left_blackeye.setPosition(Math.PI / 2, 0.5, 0, -0.2, -1.4, 0.2, PHI, THETA);

		//right_blackeye
		right_blackeye.setPosition(
			Math.PI / 2,
			-0.5,
			0,
			0.2,
			-1.4,
			0.2,
			PHI,
			THETA
		);

		//mouth
		mouth.setPosition(Math.PI / 2, 0, 0, 0.18, -1.1, -0.6, PHI, THETA);

		//hat_top
		hat_top.setPosition(0, 0, 0, 0, 0, 0.5, PHI, THETA);

		//hat_middle
		hat_middle.setPosition(0, 0, 0, 0, -0.2, 0.45, PHI, THETA);

		//hat_left
		hat_left.setPosition(
			Math.PI / 2 + 0.3,
			0.05,
			1.5,
			-1.2,
			0.2,
			0.45,
			PHI,
			THETA
		);

		//hat_right
		hat_right.setPosition(
			Math.PI / 2 - 0.3,
			0.05,
			1.5,
			1.2,
			0.2,
			0.45,
			PHI,
			THETA
		);

		//hat_back
		hat_back.setPosition(Math.PI / 2, 0, 0, 0, 1, 1.1, PHI, THETA);

		//body
		body.setPosition(0, 0, 0, 0, 0, -2.7, PHI, THETA);

		//left_arm
		left_arm.setPosition(0, 0.6, 0, -0.8, 0, -1.65, PHI, THETA);

		//right_arm
		right_arm.setPosition(0, -0.6, 0, 0.8, 0, -1.65, PHI, THETA);

		//right_elbow
		right_elbow.setPosition(0, 0, 0, 0.82, 0, -1.7, PHI, THETA);

		//left_elbow
		left_elbow.setPosition(0, -0.15, 0, -0.82, 0, -1.7, PHI, THETA);

		//left_forearm
		left_forearm.setPosition(0, 0.15, 0, -0.9, 0, -2.2, PHI, THETA);

		//right_forearm
		right_forearm.setPosition(0, -0.15, 0, 0.9, 0, -2.2, PHI, THETA);

		//left_hand
		left_hand.setPosition(0, 0, 0, -0.9, 0, -2.3, PHI, THETA);

		//right_hand
		right_hand.setPosition(0, 0, 0, 0.9, 0, -2.3, PHI, THETA);

		//left_thumb
		left_thumb.setPosition(
			Math.PI / 2,
			Math.PI / 2,
			0,
			-0.9,
			-0.18,
			-2.3,
			PHI,
			THETA
		);

		//right_thumb
		right_thumb.setPosition(
			Math.PI / 2,
			Math.PI / 2,
			0,
			0.9,
			-0.18,
			-2.3,
			PHI,
			THETA
		);

		//left_leg
		left_leg.setPosition(0, 0, 0, -0.38, 0, -3, PHI, THETA);

		//right_leg
		right_leg.setPosition(0, 0, 0, 0.38, 0, -3, PHI, THETA);

		//left_shoe
		left_shoe.setPosition(0, 0, 0, -0.38, -0.18, -3.08, PHI, THETA);

		//right_shoe
		right_shoe.setPosition(0, 0, 0, 0.38, -0.18, -3.08, PHI, THETA);

		//pocket_square_left
		pocket_square_left.setPosition(
			Math.PI / 2 - 0.3,
			0,
			-0.4,
			-0.3,
			-0.7,
			-2,
			PHI,
			THETA
		);
		pocket_square_left.changeline(true);

		//pocket_square_right
		pocket_square_right.setPosition(
			Math.PI / 2 - 0.3,
			0,
			0.4,
			0.3,
			-0.7,
			-2,
			PHI,
			THETA
		);
		pocket_square_right.changeline(true);

		//pocket_triangle_left
		pocket_triangle_left.setPosition(
			-Math.PI / 2 - 0.8,
			-0.3,
			0,
			-0.34,
			-0.76,
			-1.85,
			PHI,
			THETA
		);

		//pocket_triangle_right
		pocket_triangle_right.setPosition(
			-Math.PI / 2 - 0.8,
			-0.4,
			0.8,
			0.34,
			-0.76,
			-1.85,
			PHI,
			THETA
		);
		
		//back_sweater
		back_sweater.setPosition(-0.16, 0, 0, 0, 0.2, -1.235, PHI, THETA);

		//front_sweater_left
		front_sweater_left.setPosition(
			-Math.PI / 2 - 0.5,
			-0.05,
			-0.5,
			-0.35,
			-0.35,
			-1.1,
			PHI,
			THETA
		);

		//front_sweater_right
		front_sweater_right.setPosition(
			-Math.PI / 2 - 0.5,
			0.05,
			0.5,
			0.35,
			-0.35,
			-1.1,
			PHI,
			THETA
		);

	}


	//DRAWING
	GL.clearColor(0.0, 0.0, 0.0, 0.0);
	GL.enable(GL.DEPTH_TEST);
	GL.enable(GL.BLEND);
	GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
	GL.depthFunc(GL.LEQUAL);

	GL.clearDepth(1.0);
	var time_prev = 0;
var animate = function (time) {
		var dt = time - time_prev;
		if (!drag) {
			dX *= AMORTIZATION;
			dY *= AMORTIZATION;
			THETA += dX;
			PHI += dY;
		}
		setAllPosition();

		LIBS.rotateX(LIBS.get_I4,0.003);
		GL.viewport(0, 0, CANVAS.width, CANVAS.height);
		GL.clear(GL.COLOR_BUFFER_BIT);

		head.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		head.draw();

		body.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body.draw();
		GL.flush();
		window.requestAnimationFrame(animate);
	};
	animate();
	var angle = 0;
var loop = function(){
	var angle = performance.now() /1000/6*2*Math.PI;


}
	
}

window.addEventListener("load", main);
