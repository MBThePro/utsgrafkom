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
		LIBS.translateY(this.MOVEMATRIX, y);
		LIBS.translateX(this.MOVEMATRIX, x);
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
	setPosition(x1, y1, z1, x2, y2, z2) {
		this.setIdentityMove();
		this.setRotateMove(x1, y1, z1);
		this.setTranslateMove(x2, y2, z2);
	}

	setResponsiveRotation(PHI, THETA) {
		var temps = LIBS.get_I4();
		LIBS.rotateX(temps, PHI);
		this.MOVEMATRIX = LIBS.multiply(this.MOVEMATRIX, temps);

		LIBS.rotateY(temps, THETA);
		this.MOVEMATRIX = LIBS.multiply(this.MOVEMATRIX, temps);
	}
}

function main() {
	var CANVAS = document.getElementById("mycanvas");

	CANVAS.width = window.innerWidth;
	CANVAS.height = window.innerHeight;

	var drag = false;
	var x_prev, y_prev;
	var THETA = 0,
		PHI = 0;
	var dX = 0;
	dY = 0;
	var AMORTIZATION = 0.95;
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

	//#region stan
	//head
	stackCount = 100;
	sectorCount = 100;
	radius = 1.2;
	object_vertex = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;
			if (z >= -2.2) {
				object_vertex.push(x, y, z, 0.984, 0.882, 0.788);
			}
		}
	}
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

	//body
	object_vertex1 = [];
	outerRad = 1;
	innerRad = 0.5; //
	height = 1.5;
	segments = 50;

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
		object_vertex1.push(bottomX, bottomY, bottomZ, 0.8745, 0.5412, 0.4784);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		if (i == 75) object_vertex1.push(topX, topY, topZ, 0, 0, 0);
		else object_vertex1.push(topX, topY, topZ, 0.8745, 0.5412, 0.4784);
	}
	object_faces1 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces1.push(index, index + 2, 0); // Bottom face
		object_faces1.push(index + 1, 1, index + 3); // Top face
		object_faces1.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces1.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces1.push(1, segments * 2 + 3, 3); // Top circle

	//left_shoulder & right_shoulder
	object_vertex2 = [];
	outerRad = 0.2;
	innerRad = 0.2; //
	height = 0.5;
	segments = 50;
	object_vertex2.push(0, 0, 0, 0.698, 0.4314, 0.3843); // Center vertex for bottom circle
	object_vertex2.push(0, 0, height, 0.698, 0.4314, 0.3843); // Center vertex for top circle
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
		object_vertex2.push(bottomX, bottomY, bottomZ, 0.698, 0.4314, 0.3843);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex2.push(topX, topY, topZ, 0.698, 0.4314, 0.3843);
	}
	object_faces2 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces2.push(index, index + 2, 0); // Bottom face
		object_faces2.push(index + 1, 1, index + 3); // Top face
		object_faces2.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces2.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces2.push(1, segments * 2 + 3, 3); // Top circle

	//left & right arm
	object_vertex3 = [];
	outerRad = 0.2;
	innerRad = 0.2; //
	height = 0.5;
	segments = 100;
	object_vertex3.push(0, 0, 0, 0.698, 0.4314, 0.3843); // Center vertex for bottom circle
	object_vertex3.push(0, 0, height, 0.698, 0.4314, 0.3843); // Center vertex for top circle
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
		object_vertex3.push(bottomX, bottomY, bottomZ, 0.698, 0.4314, 0.3843);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex3.push(topX, topY, topZ, 0.698, 0.4314, 0.3843);
	}
	object_faces3 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces3.push(index, index + 2, 0); // Bottom face
		object_faces3.push(index + 1, 1, index + 3); // Top face
		object_faces3.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces3.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces3.push(1, segments * 2 + 3, 3); // Top circle

	//left&right elbow
	stackCount = 50;
	sectorCount = 50;
	radius = 0.2;
	object_vertex4 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;

			object_vertex4.push(x, y, z, 0.698, 0.4314, 0.3843);
		}
	}
	object_faces4 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces4.push(k1, k2, k3);
			object_faces4.push(k2, k4, k3);
		}
	}

	//left&right hands
	stackCount = 50;
	sectorCount = 50;
	radiusX = 0.2; // Radius along x-axis
	radiusY = 0.2; // Radius along y-axis
	radiusZ = 0.25; // Radius along z-axis (elongation)
	object_vertex5 = [];
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

			object_vertex5.push(x, y, z, 0.9333, 0.1961, 0.2941);
		}
	}
	object_faces5 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces5.push(k1, k2, k3);
			object_faces5.push(k2, k4, k3);
		}
	}

	//left & right thumb
	object_vertex6 = [];
	outerRad = 0.1;
	innerRad = 0.08; //
	height = 0.14;
	segments = 4;
	object_vertex6.push(0, 0, 0, 0.9333, 0.1961, 0.2941); // Center vertex for bottom circle
	object_vertex6.push(0, 0, height, 0.9333, 0.1961, 0.2941); // Center vertex for top circle
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
		object_vertex6.push(bottomX, bottomY, bottomZ, 0.9333, 0.1961, 0.2941);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex6.push(topX, topY, topZ, 0.9333, 0.1961, 0.2941);
	}
	object_faces6 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces6.push(index, index + 2, 0); // Bottom face
		object_faces6.push(index + 1, 1, index + 3); // Top face
		object_faces6.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces6.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces6.push(1, segments * 2 + 3, 3); // Top circle

	//left & right leg
	object_vertex7 = [];
	outerRad = 0.6;
	innerRad = 0.6; //
	height = 0.3;
	segments = 100;
	object_vertex7.push(0, 0, 0, 0.3019, 0.4902, 0.7412); // Center vertex for bottom circle
	object_vertex7.push(0, 0, height, 0.3019, 0.4902, 0.7412); // Center vertex for top circle
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
		object_vertex7.push(bottomX, bottomY, bottomZ, 0.3019, 0.4902, 0.7412);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex7.push(topX, topY, topZ, 0.3019, 0.4902, 0.7412);
	}
	object_faces7 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces7.push(index, index + 2, 0); // Bottom face
		object_faces7.push(index + 1, 1, index + 3); // Top face
		object_faces7.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces7.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces7.push(1, segments * 2 + 3, 3); // Top circle

	//left & right shoe
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 0.62; // Radius along x-axis
	radiusY = 0.75; // Radius along y-axis
	radiusZ = 0.1; // Set to a small value for a flat circle
	object_vertex8 = [];
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

			object_vertex8.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces8 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces8.push(k1, k2, k3);
			object_faces8.push(k2, k4, k3);
		}
	}

	//left&right eye
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 0.3; // Radius along x-axis
	radiusY = 0.4; // Radius along y-axis
	radiusZ = 0.2; // Set to a small value for a flat circle
	object_vertex9 = [];
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

			object_vertex9.push(x, y, z, 255, 255, 255);
		}
	}
	object_faces9 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces9.push(k1, k2, k3);
			object_faces9.push(k2, k4, k3);
		}
	}

	//left&right blackeye
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 0.06; // Radius along x-axis
	radiusY = 0.06; // Radius along y-axis
	radiusZ = 0.05; // Set to a small value for a flat circle
	object_vertex10 = [];
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

			object_vertex10.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces10 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces10.push(k1, k2, k3);
			object_faces10.push(k2, k4, k3);
		}
	}

	//mouth
	var segments = 50;
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

	//puffball
	stackCount = 50;
	sectorCount = 50;
	radius = 0.25;
	object_vertex12 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;

			object_vertex12.push(x, y, z, 0.9333, 0.1961, 0.2941);
		}
	}
	object_faces12 = [];

	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces12.push(k1, k2, k3);
			object_faces12.push(k2, k4, k3);
		}
	}

	//hat_middle
	object_vertex13 = [];
	outerRad = 1.25;
	innerRad = 1.25;
	height = 0.25;
	segments = 100;
	object_vertex13.push(0, 0, 0, 0.9333, 0.1961, 0.2941); // Center vertex for bottom circle
	object_vertex13.push(0, 0, height, 0.9333, 0.1961, 0.2941); // Center vertex for top circle
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
		object_vertex13.push(bottomX, bottomY, bottomZ, 0.9333, 0.1961, 0.2941);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex13.push(topX, topY, topZ, 0.9333, 0.1961, 0.2941);
	}
	object_faces13 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces13.push(index, index + 2, 0); // Bottom face
		object_faces13.push(index + 1, 1, index + 3); // Top face
		object_faces13.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}

	//left&right hat
	stackCount = 0; // Reduced for half
	sectorCount = 0;
	radiusX = 0; // Radius along x-axis
	radiusY = 0; // Radius along y-axis
	radiusZ = 0; // Set to a small value for a flat circle
	object_vertex14 = [];
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
				object_vertex14.push(x, y, z, 0.4902, 0.8157, 0.5176);
			}
		}
	}
	object_faces14 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces14.push(k1, k2, k3);
			object_faces14.push(k2, k4, k3);
		}
	}

	//back hat
	stackCount = 50; // Half the stack count for half sphere
	sectorCount = 100;
	radius = 1.22;
	object_vertex15 = [];

	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount - Math.PI / 2; // Shift by -pi/2 for half sphere
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;

			object_vertex15.push(x, y, z, 0.3019, 0.4902, 0.7412);
		}
	}
	object_faces15 = [];

	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces15.push(k1, k2, k3);
			object_faces15.push(k2, k4, k3);
		}
	}

	//shirtline
	object_vertex16 = [];
	outerRad = 0.01;
	innerRad = 0.01; //
	height = 1.5;
	segments = 50;
	object_vertex16.push(0, 0, 0, 0, 0, 0); // Center vertex for bottom circle
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
		object_vertex16.push(bottomX, bottomY, bottomZ, 0, 0, 0);

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

	//buttons
	stackCount = 50;
	sectorCount = 50;
	radius = 0.08;
	object_vertex17 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;

			object_vertex17.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces17 = [];

	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces17.push(k1, k2, k3);
			object_faces17.push(k2, k4, k3);
		}
	}

	//back_sweater
	object_vertex18 = [];
	outerRad = 0.75;
	innerRad = 0.75; //
	height = 0.5;
	segments = 100;
	object_vertex18.push(0, 0, 0, 0.9333, 0.1961, 0.2941); // Center vertex for bottom circle
	object_vertex18.push(0, 0, height, 0.9333, 0.1961, 0.2941); // Center vertex for top circle
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
		object_vertex18.push(bottomX, bottomY, bottomZ, 0.9333, 0.1961, 0.2941);
		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex18.push(topX, topY, topZ, 0.9333, 0.1961, 0.2941);
	}
	object_faces18 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces18.push(index, index + 2, 0); // Bottom face
		object_faces18.push(index + 1, 1, index + 3); // Top face
		object_faces18.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces18.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces18.push(1, segments * 2 + 3, 3); // Top circle

	//front_sweater
	stackCount = 50; // Reduced for half
	sectorCount = 100;
	radiusX = 0.4; // Radius along x-axis
	radiusY = 0.25; // Radius along y-axis
	radiusZ = 0.1; // Set to a small value for a flat circle
	object_vertex19 = [];
	for (var i = 0; i <= stackCount / 2; ++i) {
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

			object_vertex19.push(x, y, z, 0.9333, 0.1961, 0.2941);
		}
	}
	object_faces19 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces19.push(k1, k2, k3);
			object_faces19.push(k2, k4, k3);
		}
	}

	var object = new MyObject(
		object_vertex,
		object_faces,
		shader_vertex_source,
		shader_fragment_source
	);
	var body = new MyObject(
		object_vertex1,
		object_faces1,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_shoulder = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_shoulder = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_arm = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_arm = new MyObject(
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
	var shirt_line = new MyObject(
		object_vertex16,
		object_faces16,
		shader_vertex_source,
		shader_fragment_source
	);
	var button1 = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var button2 = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var button3 = new MyObject(
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
	body.addChild(object);
	body.addChild(left_shoulder);
	body.addChild(right_shoulder);
	body.addChild(left_arm);
	body.addChild(right_arm);
	left_arm.addChild(left_elbow);
	right_arm.addChild(right_elbow);
	left_arm.addChild(left_hand);
	right_arm.addChild(right_hand);
	left_hand.addChild(left_thumb);
	right_hand.addChild(right_thumb);
	body.addChild(left_leg);
	body.addChild(right_leg);
	left_leg.addChild(left_shoe);
	right_leg.addChild(right_shoe);
	body.addChild(shirt_line);
	body.addChild(button1);
	body.addChild(button3);
	body.addChild(button2);
	body.addChild(back_sweater);

	//head
	object.addChild(hat_top);
	object.addChild(hat_middle);
	object.addChild(hat_left);
	object.addChild(hat_right);
	object.addChild(hat_back);
	object.addChild(left_eye);
	object.addChild(right_eye);
	object.addChild(left_blackeye);
	object.addChild(right_blackeye);
	object.addChild(mouth);

	//sweater
	back_sweater.addChild(front_sweater_left);
	back_sweater.addChild(front_sweater_right);

	//-----------------------------------------------------------------------------------------------------------
	//#endregion

	//#region eeric
	// head
	stackCount = 50;
	sectorCount = 50;
	radiusX = 1.5; // Radius along x-axis
	radiusY = 1.35; // Radius along y-axis
	radiusZ = 1.4; // Set to a small value for a flat circle
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
			if (z >= -2.2) {
				object_vertex.push(x, y, z, 0.984, 0.882, 0.788);
			}
		}
	}
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

	//left&right eye
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 100;
	radiusX = 0.3; // Radius along x-axis
	radiusY = 0.4; // Radius along y-axis
	radiusZ = 0.2; // Set to a small value for a flat circle
	object_vertex2 = [];
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

			object_vertex2.push(x, y, z, 255, 255, 255);
		}
	}
	object_faces2 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces2.push(k1, k2, k3);
			object_faces2.push(k2, k4, k3);
		}
	}

	//left&right blackeye
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 100;
	radiusX = 0.03; // Radius along x-axis
	radiusY = 0.03; // Radius along y-axis
	radiusZ = 0.02; // Set to a small value for a flat circle
	object_vertex3 = [];
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

			object_vertex3.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces3 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces3.push(k1, k2, k3);
			object_faces3.push(k2, k4, k3);
		}
	}

	// hat
	stackCount = 50;
	sectorCount = 50;
	radiusX = 1.55; // Radius along x-axis
	radiusY = 1.4; // Radius along y-axis
	radiusZ = 1.4; // Set to a small value for a flat circle
	object_vertex4 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 1 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radiusX * cosPhi * sinTheta;
			var y = radiusY * cosTheta;
			var z = radiusZ * sinPhi * sinTheta;
			if (z >= -2.2) {
				object_vertex4.push(x, y, z, 0, 1, 1);
			}
		}
	}
	object_faces4 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces4.push(k1, k2, k3);
			object_faces4.push(k2, k4, k3);
		}
	}

	// body
	stackCount = 50;
	sectorCount = 50;
	radiusX = 2; // Radius along x-axis
	radiusY = 2; // Radius along y-axis
	radiusZ = 2.2; // Set to a small value for a flat circle
	object_vertex5 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 1 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radiusX * cosPhi * sinTheta;
			var y = radiusY * cosTheta;
			var z = radiusZ * sinPhi * sinTheta;
			if (z >= -2.2) {
				object_vertex5.push(x, y, z, 1, 0, 0);
			}
		}
	}
	object_faces5 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces5.push(k1, k2, k3);
			object_faces5.push(k2, k4, k3);
		}
	}

	//yellow part hat
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 1.55; // Radius along x-axis
	radiusY = 1.4; // Radius along y-axis
	radiusZ = 0.3; // Set to a small value for a flat circle
	object_vertex6 = [];
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

			object_vertex6.push(x, y, z, 1, 1, 0);
		}
	}
	object_faces6 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces6.push(k1, k2, k3);
			object_faces6.push(k2, k4, k3);
		}
	}

	// pucuk hat
	stackCount = 50;
	sectorCount = 50;
	radius = 0.2;
	object_vertex7 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 2 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radius * cosPhi * sinTheta;
			var y = radius * cosTheta;
			var z = radius * sinPhi * sinTheta;
			if (z >= -2.2) {
				object_vertex7.push(x, y, z, 1, 1, 0);
			}
		}
	}
	object_faces7 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces7.push(k1, k2, k3);
			object_faces7.push(k2, k4, k3);
		}
	}

	//left & right leg
	object_vertex8 = [];
	outerRad = 1.2;
	innerRad = 1.4; //
	height = 0.5;
	segments = 100;
	object_vertex8.push(0, 0, 0, 0.509, 0.204, 0); // Center vertex for bottom circle
	object_vertex8.push(0, 0, height, 0.509, 0.204, 0); // Center vertex for top circle
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
		object_vertex8.push(bottomX, bottomY, bottomZ, 0.509, 0.204, 0);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex8.push(topX, topY, topZ, 0.509, 0.204, 0);
	}
	object_faces8 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces8.push(index, index + 2, 0); // Bottom face
		object_faces8.push(index + 1, 1, index + 3); // Top face
		object_faces8.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces8.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces8.push(1, segments * 2 + 3, 3); // Top circle

	//left & right shoe
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 1.22; // Radius along x-axis
	radiusY = 1.35; // Radius along y-axis
	radiusZ = 0.18; // Set to a small value for a flat circle
	object_vertex9 = [];
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

			object_vertex9.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces9 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces9.push(k1, k2, k3);
			object_faces9.push(k2, k4, k3);
		}
	}

	//left & right arm
	object_vertex10 = [];
	outerRad = 0.3;
	innerRad = 0.3; //
	height = 1.3;
	segments = 100;
	object_vertex10.push(0, 0, 0, 0.9, 0, 0); // Center vertex for bottom circle
	object_vertex10.push(0, 0, height, 0.9, 0, 0); // Center vertex for top circle
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
		object_vertex10.push(bottomX, bottomY, bottomZ, 0.9, 0, 0);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex10.push(topX, topY, topZ, 0.9, 0, 0);
	}
	object_faces10 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces10.push(index, index + 2, 0); // Bottom face
		object_faces10.push(index + 1, 1, index + 3); // Top face
		object_faces10.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces10.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces10.push(1, segments * 2 + 3, 3); // Top circle

	// left&right hand
	stackCount = 50;
	sectorCount = 50;
	radiusX = 0.22;
	radiusY = 0.25;
	radiusZ = 0.32;
	object_vertex11 = [];
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
			if (z >= -2.2) {
				object_vertex11.push(x, y, z, 1, 1, 0);
			}
		}
	}
	object_faces11 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces11.push(k1, k2, k3);
			object_faces11.push(k2, k4, k3);
		}
	}

	//resleting
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 0.05; // Radius along x-axis
	radiusY = 1.4; // Radius along y-axis
	radiusZ = 1.95; // Set to a small value for a flat circle
	object_vertex12 = [];
	for (var i = 0; i <= stackCount; ++i) {
		var theta = (i * Math.PI) / stackCount;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var j = 0; j <= sectorCount; ++j) {
			var phi = (j * 1 * Math.PI) / sectorCount;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			var x = radiusX * cosPhi * sinTheta;
			var y = radiusY * cosTheta;
			var z = radiusZ * sinPhi * sinTheta;

			object_vertex12.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces12 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces12.push(k1, k2, k3);
			object_faces12.push(k2, k4, k3);
		}
	}

	// buttons
	stackCount = 50; // Reduced to 1 for a flat circle
	sectorCount = 50;
	radiusX = 0.07; // Radius along x-axis
	radiusY = 0.07; // Radius along y-axis
	radiusZ = 0.06; // Set to a small value for a flat circle
	object_vertex13 = [];
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

			object_vertex13.push(x, y, z, 0, 0, 0);
		}
	}
	object_faces13 = [];
	for (var i = 0; i < stackCount; ++i) {
		for (var j = 0; j < sectorCount; ++j) {
			var k1 = i * (sectorCount + 1) + j;
			var k2 = k1 + 1;
			var k3 = (i + 1) * (sectorCount + 1) + j;
			var k4 = k3 + 1;

			object_faces13.push(k1, k2, k3);
			object_faces13.push(k2, k4, k3);
		}
	}

	//mouth
	object_vertex14 = [];
	outerRad = 0.3;
	innerRad = 0; //
	height = 0.18;
	segments = 3;
	object_vertex14.push(0, 0, 0, 0, 0, 0); // Center vertex for bottom circle
	object_vertex14.push(0, 0, height, 0, 0, 0); // Center vertex for top circle
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
		object_vertex14.push(bottomX, bottomY, bottomZ, 0, 0, 0);
		// object_vertex14.push(bottomX, bottomY, bottomZ, 0, 0, 0);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex14.push(topX, topY, topZ, 0, 0, 0);
	}
	object_faces14 = [];
	for (var i = 0; i < segments; i++) {
		var index = i * 2 + 2;
		object_faces14.push(index, index + 2, 0); // Bottom face
		object_faces14.push(index + 1, 1, index + 3); // Top face
		object_faces14.push(
			index,
			index + 1,
			index + 3,
			index,
			index + 3,
			index + 2
		); // Side faces
	}
	// Closing faces for the bottom and top circles
	object_faces14.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces14.push(1, segments * 2 + 3, 3); // Top circle

	var object_cartman = new MyObject(
		object_vertex,
		object_faces,
		shader_vertex_source,
		shader_fragment_source
	);

	var left_eye_cartman = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_eye_cartman = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_blackeye_cartman = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_blackeye_cartman = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);

	var hat_cartman = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);

	var body_cartman = new MyObject(
		object_vertex5,
		object_faces5,
		shader_vertex_source,
		shader_fragment_source
	);

	var yellowpart_cartman = new MyObject(
		object_vertex6,
		object_faces6,
		shader_vertex_source,
		shader_fragment_source
	);

	var pucukhat_cartman = new MyObject(
		object_vertex7,
		object_faces7,
		shader_vertex_source,
		shader_fragment_source
	);

	var left_leg_cartman = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_leg_cartman = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_shoe_cartman = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_shoe_cartman = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);

	var left_arm_cartman = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);

	var right_arm_cartman = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);

	var left_hand_cartman = new MyObject(
		object_vertex11,
		object_faces11,
		shader_vertex_source,
		shader_fragment_source
	);

	var right_hand_cartman = new MyObject(
		object_vertex11,
		object_faces11,
		shader_vertex_source,
		shader_fragment_source
	);

	var resleting_cartman = new MyObject(
		object_vertex12,
		object_faces12,
		shader_vertex_source,
		shader_fragment_source
	);

	var button1_cartman = new MyObject(
		object_vertex13,
		object_faces13,
		shader_vertex_source,
		shader_fragment_source
	);

	var button2_cartman = new MyObject(
		object_vertex13,
		object_faces13,
		shader_vertex_source,
		shader_fragment_source
	);

	var button3_cartman = new MyObject(
		object_vertex13,
		object_faces13,
		shader_vertex_source,
		shader_fragment_source
	);

	var mouth_cartman = new MyObject(
		object_vertex14,
		object_faces14,
		shader_vertex_source,
		shader_fragment_source
	);

	body_cartman.addChild(object_cartman);
	object_cartman.addChild(left_eye_cartman);
	object_cartman.addChild(right_eye_cartman);
	object_cartman.addChild(left_blackeye_cartman);
	object_cartman.addChild(right_blackeye_cartman);
	object_cartman.addChild(hat_cartman);
	object_cartman.addChild(yellowpart_cartman);
	object_cartman.addChild(pucukhat_cartman);
	object_cartman.addChild(mouth_cartman);

	body_cartman.addChild(left_leg_cartman);
	body_cartman.addChild(right_leg_cartman);
	body_cartman.addChild(left_shoe_cartman);
	body_cartman.addChild(right_shoe_cartman);
	body_cartman.addChild(left_arm_cartman);
	body_cartman.addChild(right_arm_cartman);
	body_cartman.addChild(left_hand_cartman);
	body_cartman.addChild(right_hand_cartman);
	body_cartman.addChild(resleting_cartman);
	body_cartman.addChild(button1_cartman);
	body_cartman.addChild(button2_cartman);
	body_cartman.addChild(button3_cartman);

	//#endregion
	//--------------------------------------------------------------------------------------------------------------------------
	//#region kyle
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
			object_faces.push(
				index,
				index + 1,
				index + 3,
				index,
				index + 3,
				index + 2
			); // Side faces dioffset agar tidak bertabrakan
		}
		object_faces.push(2, sectorCount * 2 + 2, 0); // Bottom circle
		object_faces.push(1, sectorCount * 2 + 3, 3); // Top circle
		return this.object_faces;
	}
	function createCuboidVertices(width, length, height, r, g, b) {
		var halfWidth = width / 2;
		var halfLength = length / 2;
		var halfHeight = height / 2;

		var color = [r, g, b];

		var vertices = [
			// Front face
			-halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],

			// Back face
			-halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],

			// Top face
			-halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],

			// Bottom face
			-halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],

			// Left face
			-halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			-halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],

			// Right face
			halfWidth,
			-halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			-halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
			halfWidth,
			-halfLength,
			halfHeight,
			color[0],
			color[1],
			color[2],
		];

		return vertices;
	}
	//head
	object_vertex0 = sphereVertex(50, 100, 1.2, 1.2, 1.2, 0.984, 0.882, 0.788);
	object_faces0 = sphereFaces(50, 100);

	//body
	object_vertex1 = [];
	outerRad = 1;
	innerRad = 0.5;
	height = 1.5;
	segments = 50;

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
	object_vertex2 = tubeVertex(0.2, 0.2, 0.5, 50, 0.886, 0.321, 0.204);
	object_faces2 = tubeFaces(50);

	//left & right forearm
	object_vertex3 = tubeVertex(0.2, 0.2, 0.5, 100, 0.886, 0.321, 0.204);
	object_faces3 = tubeFaces(100);

	//left&right elbow
	object_vertex4 = sphereVertex(50, 50, 0.2, 0.2, 0.2, 0.886, 0.321, 0.204);
	object_faces4 = sphereFaces(50, 50);

	//left&right hands
	object_vertex5 = sphereVertex(50, 50, 0.2, 0.2, 0.25, 0.4902, 0.8157, 0.5176);
	object_faces5 = sphereFaces(50, 50);

	//left & right thumb
	object_vertex6 = tubeVertex(0.1, 0.08, 0.14, 4, 0.4412, 0.7348, 0.4658);
	object_faces6 = tubeFaces(4);

	//left & right leg
	object_vertex7 = tubeVertex(0.6, 0.6, 0.3, 100, 0.1216, 0.2784, 0.2471);
	object_faces7 = tubeFaces(100);

	//left & right shoe
	object_vertex8 = sphereVertex(50, 50, 0.62, 0.75, 0.15, 0, 0, 0);
	object_faces8 = sphereFaces(50, 50);

	//left&right eye
	object_vertex9 = sphereVertex(50, 50, 0.3, 0.4, 0.2, 255, 255, 255);
	object_faces9 = sphereFaces(50, 50);

	//left&right blackeye
	object_vertex10 = sphereVertex(50, 50, 0.06, 0.06, 0.05, 0, 0, 0);
	object_faces10 = sphereFaces(50, 50);

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
	object_vertex12 = tubeVertex(1.25, 1.25, 1, 100, 0.4902, 0.8157, 0.5176);
	object_faces12 = tubeFaces(100);

	//hat_middle
	object_vertex13 = tubeVertex(1.25, 1.25, 0.5, 100, 0.4412, 0.7348, 0.4658);
	object_faces13 = tubeFaces(100);

	//left&right hat
	object_vertex14 = halfsphereVertex(
		50,
		50,
		0.8,
		1,
		0.2,
		0.4902,
		0.8157,
		0.5176
	);
	object_faces14 = sphereFaces(50, 100);

	//back hat
	object_vertex15 = halfsphereVertex(
		50,
		100,
		1.3,
		1.7,
		0.4,
		0.4902,
		0.8157,
		0.5176
	);
	object_faces15 = sphereFaces(50, 100);

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
	object_vertex18 = tubeVertex(0.75, 0.75, 0.5, 100, 0.1216, 0.2784, 0.2471);
	object_faces18 = tubeFaces(100);

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

	var head_kyle = new MyObject(
		object_vertex0,
		object_faces0,
		shader_vertex_source,
		shader_fragment_source
	);
	var body_kyle = new MyObject(
		object_vertex1,
		object_faces1,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_arm_kyle = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_arm_kyle = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_forearm_kyle = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_forearm_kyle = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_elbow_kyle = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_elbow_kyle = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_hand_kyle = new MyObject(
		object_vertex5,
		object_faces5,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_hand_kyle = new MyObject(
		object_vertex5,
		object_faces5,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_thumb_kyle = new MyObject(
		object_vertex6,
		object_faces6,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_thumb_kyle = new MyObject(
		object_vertex6,
		object_faces6,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_leg_kyle = new MyObject(
		object_vertex7,
		object_faces7,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_leg_kyle = new MyObject(
		object_vertex7,
		object_faces7,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_shoe_kyle = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_shoe_kyle = new MyObject(
		object_vertex8,
		object_faces8,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_eye_kyle = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_eye_kyle = new MyObject(
		object_vertex9,
		object_faces9,
		shader_vertex_source,
		shader_fragment_source
	);
	var left_blackeye_kyle = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);
	var right_blackeye_kyle = new MyObject(
		object_vertex10,
		object_faces10,
		shader_vertex_source,
		shader_fragment_source
	);
	var mouth_kyle = new MyObject(
		object_vertex11,
		object_faces11,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_top_kyle = new MyObject(
		object_vertex12,
		object_faces12,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_middle_kyle = new MyObject(
		object_vertex13,
		object_faces13,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_left_kyle = new MyObject(
		object_vertex14,
		object_faces14,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_right_kyle = new MyObject(
		object_vertex14,
		object_faces14,
		shader_vertex_source,
		shader_fragment_source
	);
	var hat_back_kyle = new MyObject(
		object_vertex15,
		object_faces15,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_triangle_left_kyle = new MyObject(
		object_vertex16,
		object_faces16,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_square_left_kyle = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_triangle_right_kyle = new MyObject(
		object_vertex16,
		object_faces16,
		shader_vertex_source,
		shader_fragment_source
	);
	var pocket_square_right_kyle = new MyObject(
		object_vertex17,
		object_faces17,
		shader_vertex_source,
		shader_fragment_source
	);
	var back_sweater_kyle = new MyObject(
		object_vertex18,
		object_faces18,
		shader_vertex_source,
		shader_fragment_source
	);
	var front_sweater_left_kyle = new MyObject(
		object_vertex19,
		object_faces19,
		shader_vertex_source,
		shader_fragment_source
	);
	var front_sweater_right_kyle = new MyObject(
		object_vertex19,
		object_faces19,
		shader_vertex_source,
		shader_fragment_source
	);

	//body
	body_kyle.addChild(head_kyle);
	body_kyle.addChild(left_arm_kyle);
	body_kyle.addChild(right_arm_kyle);
	body_kyle.addChild(left_forearm_kyle);
	body_kyle.addChild(right_forearm_kyle);
	left_forearm_kyle.addChild(left_elbow_kyle);
	right_forearm_kyle.addChild(right_elbow_kyle);
	left_forearm_kyle.addChild(left_hand_kyle);
	right_forearm_kyle.addChild(right_hand_kyle);
	left_hand_kyle.addChild(left_thumb_kyle);
	right_hand_kyle.addChild(right_thumb_kyle);
	body_kyle.addChild(left_leg_kyle);
	body_kyle.addChild(right_leg_kyle);
	left_leg_kyle.addChild(left_shoe_kyle);
	right_leg_kyle.addChild(right_shoe_kyle);
	body_kyle.addChild(pocket_triangle_left_kyle);
	body_kyle.addChild(pocket_triangle_right_kyle);
	body_kyle.addChild(pocket_square_left_kyle);
	body_kyle.addChild(pocket_square_right_kyle);
	body_kyle.addChild(back_sweater_kyle);

	//head
	head_kyle.addChild(hat_top_kyle);
	head_kyle.addChild(hat_middle_kyle);
	head_kyle.addChild(hat_left_kyle);
	head_kyle.addChild(hat_right_kyle);
	head_kyle.addChild(hat_back_kyle);
	head_kyle.addChild(left_eye_kyle);
	head_kyle.addChild(right_eye_kyle);
	head_kyle.addChild(left_blackeye_kyle);
	head_kyle.addChild(right_blackeye_kyle);
	head_kyle.addChild(mouth_kyle);

	//sweater
	back_sweater_kyle.addChild(front_sweater_left_kyle);
	back_sweater_kyle.addChild(front_sweater_right_kyle);
	//#endregion

	//#region enviroment
	//wall
	object_vertex4 = createCuboidVertices(
		1,
		6,
		CANVAS.width,
		165 / 255,
		51 / 255,
		51 / 255
	);
	object_faces = [
		0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 3, 7, 0, 4, 7, 1, 2, 6, 1, 5, 6, 2,
		3, 6, 3, 7, 6, 0, 1, 5, 0, 4, 5,
	];
	//land
	object_vertex1 = createCuboidVertices(
		1,
		CANVAS.width,
		70,
		220 / 255,
		220 / 255,
		220 / 255
	);
	object_faces1 = [
		0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 3, 7, 0, 4, 7, 1, 2, 6, 1, 5, 6, 2,
		3, 6, 3, 7, 6, 0, 1, 5, 0, 4, 5,
	];
	//sticks
	object_vertex2 = tubeVertex(0.5, 0.5, 8, 50, 0.5451, 0.2706, 0.0745);
	object_faces2 = tubeFaces(50);

	var wall = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);
	var land = new MyObject(
		object_vertex1,
		object_faces1,
		shader_vertex_source,
		shader_fragment_source
	);

	var sticks = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
	object_vertex2 = tubeVertex(0.5, 0.5, 7, 50, 0.5451, 0.2706, 0.0745);
	object_faces2 = tubeFaces(50);
	var sticks1 = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
		object_vertex2 = tubeVertex(0.5, 0.5, 6, 50, 0.5451, 0.2706, 0.0745);
	object_faces2 = tubeFaces(50);
	var sticks2 = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);
		object_vertex2 = tubeVertex(0.5, 0.5, 6, 50, 0.5451, 0.2706, 0.0745);
	object_faces2 = tubeFaces(50);
	var sticks3 = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);

	for (i = 0; i < 5; i++) {
		var object_vertex3 = tubeVertex(6 - i, 0.1, 3, 3, 0.1333, 0.5451, 0.1333);
		var object_faces3 = tubeFaces(3);
		sticks.addChild(
			new MyObject(
				object_vertex3,
				object_faces3,
				shader_vertex_source,
				shader_fragment_source
			)
		);
		sticks1.addChild(
			new MyObject(
				object_vertex3,
				object_faces3,
				shader_vertex_source,
				shader_fragment_source
			)
		);
	}

	for (i = 0; i < 5; i++) {
		var object_vertex3 = tubeVertex(6 - i*0.7, 0.1, 3, 3, 0.1333, 0.5451, 0.1333);
		var object_faces3 = tubeFaces(3);
		sticks2.addChild(
			new MyObject(
				object_vertex3,
				object_faces3,
				shader_vertex_source,
				shader_fragment_source
			)
		);
		sticks3.addChild(
			new MyObject(
				object_vertex3,
				object_faces3,
				shader_vertex_source,
				shader_fragment_source
			)
		);
	}

	//#endregion
	//Matrix
	var PROJMATRIX = LIBS.get_projection(
		40,
		CANVAS.width / CANVAS.height,
		1,
		100
	);
	var VIEWMATRIX = LIBS.get_I4();

	LIBS.translateZ(VIEWMATRIX, -40);

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
		//#region CharactersetBasePosition
		object.setPosition(0, 0, 0, 0, 0, 0);
		// Set responsive rotation
		left_eye.setResponsiveRotation(PHI, THETA);
		right_eye.setResponsiveRotation(PHI, THETA);
		left_blackeye.setResponsiveRotation(PHI, THETA);
		right_blackeye.setResponsiveRotation(PHI, THETA);
		mouth.setResponsiveRotation(PHI, THETA);
		hat_top.setResponsiveRotation(PHI, THETA);
		hat_middle.setResponsiveRotation(PHI, THETA);
		hat_left.setResponsiveRotation(PHI, THETA);
		hat_right.setResponsiveRotation(PHI, THETA);
		hat_back.setResponsiveRotation(PHI, THETA);
		body.setResponsiveRotation(PHI, THETA);
		left_shoulder.setResponsiveRotation(PHI, THETA);
		right_shoulder.setResponsiveRotation(PHI, THETA);
		right_elbow.setResponsiveRotation(PHI, THETA);
		left_elbow.setResponsiveRotation(PHI, THETA);
		left_arm.setResponsiveRotation(PHI, THETA);
		right_arm.setResponsiveRotation(PHI, THETA);
		left_hand.setResponsiveRotation(PHI, THETA);
		right_hand.setResponsiveRotation(PHI, THETA);
		left_thumb.setResponsiveRotation(PHI, THETA);
		right_thumb.setResponsiveRotation(PHI, THETA);
		left_leg.setResponsiveRotation(PHI, THETA);
		right_leg.setResponsiveRotation(PHI, THETA);
		left_shoe.setResponsiveRotation(PHI, THETA);
		right_shoe.setResponsiveRotation(PHI, THETA);
		shirt_line.setResponsiveRotation(PHI, THETA);
		button1.setResponsiveRotation(PHI, THETA);
		button2.setResponsiveRotation(PHI, THETA);
		button3.setResponsiveRotation(PHI, THETA);
		back_sweater.setResponsiveRotation(PHI, THETA);
		front_sweater_left.setResponsiveRotation(PHI, THETA);
		front_sweater_right.setResponsiveRotation(PHI, THETA);

		//left_eye
		left_eye.setPosition(Math.PI / 2, 0.3, 0, -0.3, -1.2, 0.2);

		//right_eye
		right_eye.setPosition(Math.PI / 2, -0.3, 0, 0.3, -1.2, 0.2);

		//left_blackeye
		left_blackeye.setPosition(Math.PI / 2, 0.5, 0, -0.2, -1.4, 0.2);

		//right_blackeye
		right_blackeye.setPosition(Math.PI / 2, -0.5, 0, 0.2, -1.4, 0.2);

		//mouth
		mouth.setPosition(Math.PI / 2, 0, 0, 0.18, -1.1, -0.6);

		//puffball
		hat_top.setPosition(-0.35, 0, 0, 0, 0.5, 1.5);

		//hat_middle
		hat_middle.setPosition(-0.35, 0, 0, 0, 0, 0.2);

		//hat_left
		hat_left.setPosition(1.22, 0, 0, 0, 0.05, 0.2);

		//hat_right
		hat_right.setPosition(Math.PI / 2 - 0.3, 0.05, 1.5, 1.2, 0.2, 0.45);

		//hat_top
		hat_back.setPosition(1.2, 0, 0, 0, 0, 0.2);

		//body
		body.setPosition(0, 0, 0, 0, 0, -2.7);

		//left_shoulder
		left_shoulder.setPosition(0, 0.6, 0, -0.8, 0, -1.65);

		//right_shoulder
		right_shoulder.setPosition(0, -0.6, 0, 0.8, 0, -1.65);

		//right_elbow
		right_elbow.setPosition(0, 0, 0, 0.82, 0, -1.7);

		//left_elbow
		left_elbow.setPosition(0, -0.15, 0, -0.82, 0, -1.7);

		//left_arm
		left_arm.setPosition(0, 0.15, 0, -0.9, 0, -2.2);

		//right_arm
		right_arm.setPosition(0, -0.15, 0, 0.9, 0, -2.2);

		//left_hand
		left_hand.setPosition(0, 0, 0, -0.9, 0, -2.3);

		//right_hand
		right_hand.setPosition(0, 0, 0, 0.9, 0, -2.3);

		//left_thumb
		left_thumb.setPosition(Math.PI / 2, Math.PI / 2, 0, -0.9, -0.18, -2.3);

		//right_thumb
		right_thumb.setPosition(Math.PI / 2, Math.PI / 2, 0, 0.9, -0.18, -2.3);

		//left_leg
		left_leg.setPosition(0, 0, 0, -0.38, 0, -3);

		//right_leg
		right_leg.setPosition(0, 0, 0, 0.38, 0, -3);

		//left_shoe
		left_shoe.setPosition(0, 0, 0, -0.38, -0.18, -3.08);

		//right_shoe
		right_shoe.setPosition(0, 0, 0, 0.38, -0.18, -3.08);

		//shirt_line
		shirt_line.setPosition(-0.33, 0, 0, 0, -1, -2.7);

		button1.setPosition(0, 0, 0, -0.1, -0.6, -1.5);

		button2.setPosition(0, 0, 0, -0.1, -0.75, -1.9);

		button3.setPosition(0, 0, 0, -0.1, -0.9, -2.3);

		//pocket_triangle_right
		//back_sweater
		back_sweater.setPosition(-0.16, 0, 0, 0, 0.2, -1.235);

		//front_sweater_left
		front_sweater_left.setPosition(
			-Math.PI / 2 - 0.5,
			-0.05,
			-0.5,
			-0.35,
			-0.35,
			-1.1
		);

		//front_sweater_right
		front_sweater_right.setPosition(
			-Math.PI / 2 - 0.5,
			0.05,
			0.5,
			0.35,
			-0.35,
			-1.1
		);

		object_cartman.setPosition(0, 0, 0, 0, 0, 1);
		//left_eye
		left_eye_cartman.setPosition(Math.PI / 2 - 0.1, 0.3, 0, -0.3, -1.3, 1.2);

		//right_eye
		right_eye_cartman.setPosition(Math.PI / 2 - 0.1, -0.3, 0, 0.3, -1.3, 1.2);

		//left_blackeye
		left_blackeye_cartman.setPosition(Math.PI / 2, 0.5, 0, -0.2, -1.5, 1.2);

		//right_blackeye
		right_blackeye_cartman.setPosition(Math.PI / 2, -0.5, 0, 0.2, -1.5, 1.2);

		//hat
		hat_cartman.setPosition(-0.4, 0, 0, 0, 0.05, 1.1);

		//body
		body_cartman.setPosition(0, 0, 0, 0, 0, -1.7);
		//yellowpart
		yellowpart_cartman.setPosition(-0.4, 0, 0, 0, 0.05, 1.1);

		//pucukhat
		pucukhat_cartman.setPosition(0, 0, 0, 0, 0.5, 2.4);

		//left_leg
		left_leg_cartman.setPosition(0, 0, 0, -0.48, 0, -2.2);

		//right_leg
		right_leg_cartman.setPosition(0, 0, 0, 0.48, 0, -2.2);

		//left_shoe
		left_shoe_cartman.setPosition(0.05, 0, 0, -0.48, -0.15, -2.28);

		//right_shoe
		right_shoe_cartman.setPosition(0.05, 0, 0, 0.48, -0.15, -2.28);

		//left_arm
		left_arm_cartman.setPosition(0, 1, 0, -2.1, 0, -0.85);

		//right_arm
		right_arm_cartman.setPosition(0, -1, 0, 2.1, 0, -0.85);

		//left_hand
		left_hand_cartman.setPosition(0, 1, 0, -2.2, 0, -0.9);

		//right_hand
		right_hand_cartman.setPosition(0, -1, 0, 2.2, 0, -0.9);

		//resleting
		resleting_cartman.setPosition(0, 0, 0, 0, -0.65, -1.7);

		//button1
		button1_cartman.setPosition(0, 0, 0, -0.2, -2, -1.4);

		//button2
		button2_cartman.setPosition(0, 0, 0, -0.2, -1.8, -0.7);

		//button3
		button3_cartman.setPosition(0, 0, 0, -0.2, -1.4, -0.1);

		//mouth
		mouth_cartman.setPosition(Math.PI / 2 + 1.3, -0.2, -0.5, 0, -1.14, 0.5);

		head_kyle.setPosition(0, 0, 0, 0, 0, 0);

		//left_eye
		left_eye_kyle.setPosition(Math.PI / 2, 0.3, 0, -0.3, -1.2, 0.2);

		//right_eye
		right_eye_kyle.setPosition(Math.PI / 2, -0.3, 0, 0.3, -1.2, 0.2);

		//left_blackeye
		left_blackeye_kyle.setPosition(Math.PI / 2, 0.5, 0, -0.2, -1.4, 0.2);

		//right_blackeye
		right_blackeye_kyle.setPosition(Math.PI / 2, -0.5, 0, 0.2, -1.4, 0.2);

		//mouth
		mouth_kyle.setPosition(Math.PI / 2, 0, 0, 0.18, -1.1, -0.6);

		//hat_top
		hat_top_kyle.setPosition(0, 0, 0, 0, 0, 0.5);

		//hat_middle
		hat_middle_kyle.setPosition(0, 0, 0, 0, -0.2, 0.45);

		//hat_left
		hat_left_kyle.setPosition(Math.PI / 2 + 0.3, 0.05, 1.5, -1.2, 0.2, 0.45);

		//hat_right
		hat_right_kyle.setPosition(Math.PI / 2 - 0.3, 0.05, 1.5, 1.2, 0.2, 0.45);

		//hat_back
		hat_back_kyle.setPosition(Math.PI / 2, 0, 0, 0, 1, 1.1);

		//body
		body_kyle.setPosition(0, 0, 0, 0, 0, -2.7);

		//left_arm
		left_arm_kyle.setPosition(0, 0.6, 0, -0.8, 0, -1.65);

		//right_arm
		right_arm_kyle.setPosition(0, -0.6, 0, 0.8, 0, -1.65);

		//right_elbow
		right_elbow_kyle.setPosition(0, 0, 0, 0.82, 0, -1.7);

		//left_elbow
		left_elbow_kyle.setPosition(0, -0.15, 0, -0.82, 0, -1.7);

		//left_forearm
		left_forearm_kyle.setPosition(0, 0.15, 0, -0.9, 0, -2.2);

		//right_forearm
		right_forearm_kyle.setPosition(0, -0.15, 0, 0.9, 0, -2.2);

		//left_hand
		left_hand_kyle.setPosition(0, 0, 0, -0.9, 0, -2.3);
		//right_hand
		right_hand_kyle.setPosition(0, 0, 0, 0.9, 0, -2.3);

		//left_thumb
		left_thumb_kyle.setPosition(Math.PI / 2, Math.PI / 2, 0, -0.9, -0.18, -2.3);

		//right_thumb
		right_thumb_kyle.setPosition(Math.PI / 2, Math.PI / 2, 0, 0.9, -0.18, -2.3);

		//left_leg
		left_leg_kyle.setPosition(0, 0, 0, -0.38, 0, -3);

		//right_leg
		right_leg_kyle.setPosition(0, 0, 0, 0.38, 0, -3);

		//left_shoe
		left_shoe_kyle.setPosition(0, 0, 0, -0.38, -0.18, -3.08);

		//right_shoe
		right_shoe_kyle.setPosition(0, 0, 0, 0.38, -0.18, -3.08);

		//pocket_square_left
		pocket_square_left_kyle.setPosition(
			Math.PI / 2 - 0.3,
			0,
			-0.4,
			-0.3,
			-0.7,
			-2
		);
		pocket_square_left_kyle.changeline(true);

		//pocket_square_right
		pocket_square_right_kyle.setPosition(
			Math.PI / 2 - 0.3,
			0,
			0.4,
			0.3,
			-0.7,
			-2
		);
		pocket_square_right_kyle.changeline(true);

		//pocket_triangle_left
		pocket_triangle_left_kyle.setPosition(
			-Math.PI / 2 - 0.8,
			-0.3,
			0,
			-0.34,
			-0.76,
			-1.85
		);

		//pocket_triangle_right
		pocket_triangle_right_kyle.setPosition(
			-Math.PI / 2 - 0.8,
			-0.4,
			0.8,
			0.34,
			-0.76,
			-1.85
		);

		//back_sweater
		back_sweater_kyle.setPosition(-0.16, 0, 0, 0, 0.2, -1.235);

		//front_sweater_left
		front_sweater_left_kyle.setPosition(
			-Math.PI / 2 - 0.5,
			-0.05,
			-0.5,
			-0.35,
			-0.35,
			-1.1
		);

		//front_sweater_right
		front_sweater_right_kyle.setPosition(
			-Math.PI / 2 - 0.5,
			0.05,
			0.5,
			0.35,
			-0.35,
			-1.1
		);

		//#endregion

		//#region enviromentPosition
		wall.setPosition(1.5708, 0, 1.5708, 0, 20, 0);
		land.setPosition(1.5708, 1.5708, 0, 0, -10, -3.2);
		sticks.setPosition(0, 0, 0, 0, 0, 0);
		for (var i = 0; i < sticks.child.length; i++) {
			sticks.child[i].setPosition(0, 0, 0, 0, 0, 4 + i * 1.5);
		}
		sticks1.setPosition(0, 0, 0, 0, 0, 0);
		for (var i = 0; i < sticks1.child.length; i++) {
			sticks1.child[i].setPosition(0, 0, -1, 0, 0, 3 + i * 1.5);
		}
		sticks2.setPosition(0, 0, 0, 0, 0, 0);
		for (var i = 0; i < sticks2.child.length; i++) {
			sticks2.child[i].setPosition(0, 0, 0, 0, 0, 2 + i * 1.5);
		}
		sticks3.setPosition(0, 0, 0, 0, 0, 0);
		for (var i = 0; i < sticks3.child.length; i++) {
			sticks3.child[i].setPosition(0, 0, 0, 0, 0, 2 + i * 1.5);
		}

		//#endregion

		GL.viewport(0, 0, CANVAS.width, CANVAS.height);
		GL.clear(GL.COLOR_BUFFER_BIT);

		body.moveChildrenWithParent(-6, 0.5, 0.75);
		body_cartman.moveChildrenWithParent(0, 10, -0.1);
		body_kyle.moveChildrenWithParent(6, 0.5, 0.75);
		
		sticks.moveChildrenWithParent(-30,30,0);
		sticks1.moveChildrenWithParent(30,30,0);
		sticks2.moveChildrenWithParent(-10,30,0);
		sticks3.moveChildrenWithParent(10,30,0);


		//#region ResponsiveRotation
		// Set responsive rotation
		object.setResponsiveRotation(PHI, THETA);
		left_eye.setResponsiveRotation(PHI, THETA);
		right_eye.setResponsiveRotation(PHI, THETA);
		left_blackeye.setResponsiveRotation(PHI, THETA);
		right_blackeye.setResponsiveRotation(PHI, THETA);
		mouth.setResponsiveRotation(PHI, THETA);
		hat_top.setResponsiveRotation(PHI, THETA);
		hat_middle.setResponsiveRotation(PHI, THETA);
		hat_left.setResponsiveRotation(PHI, THETA);
		hat_right.setResponsiveRotation(PHI, THETA);
		hat_back.setResponsiveRotation(PHI, THETA);
		body.setResponsiveRotation(PHI, THETA);
		left_shoulder.setResponsiveRotation(PHI, THETA);
		right_shoulder.setResponsiveRotation(PHI, THETA);
		right_elbow.setResponsiveRotation(PHI, THETA);
		left_elbow.setResponsiveRotation(PHI, THETA);
		left_arm.setResponsiveRotation(PHI, THETA);
		right_arm.setResponsiveRotation(PHI, THETA);
		left_hand.setResponsiveRotation(PHI, THETA);
		right_hand.setResponsiveRotation(PHI, THETA);
		left_thumb.setResponsiveRotation(PHI, THETA);
		right_thumb.setResponsiveRotation(PHI, THETA);
		left_leg.setResponsiveRotation(PHI, THETA);
		right_leg.setResponsiveRotation(PHI, THETA);
		left_shoe.setResponsiveRotation(PHI, THETA);
		right_shoe.setResponsiveRotation(PHI, THETA);
		shirt_line.setResponsiveRotation(PHI, THETA);
		button1.setResponsiveRotation(PHI, THETA);
		button2.setResponsiveRotation(PHI, THETA);
		button3.setResponsiveRotation(PHI, THETA);
		back_sweater.setResponsiveRotation(PHI, THETA);
		front_sweater_left.setResponsiveRotation(PHI, THETA);
		front_sweater_right.setResponsiveRotation(PHI, THETA);
		object_cartman.setResponsiveRotation(PHI, THETA);
		left_eye_cartman.setResponsiveRotation(PHI, THETA);
		right_eye_cartman.setResponsiveRotation(PHI, THETA);
		left_blackeye_cartman.setResponsiveRotation(PHI, THETA);
		right_blackeye_cartman.setResponsiveRotation(PHI, THETA);
		hat_cartman.setResponsiveRotation(PHI, THETA);
		body_cartman.setResponsiveRotation(PHI, THETA);
		yellowpart_cartman.setResponsiveRotation(PHI, THETA);
		pucukhat_cartman.setResponsiveRotation(PHI, THETA);
		left_leg_cartman.setResponsiveRotation(PHI, THETA);
		right_leg_cartman.setResponsiveRotation(PHI, THETA);
		left_shoe_cartman.setResponsiveRotation(PHI, THETA);
		right_shoe_cartman.setResponsiveRotation(PHI, THETA);
		left_arm_cartman.setResponsiveRotation(PHI, THETA);
		right_arm_cartman.setResponsiveRotation(PHI, THETA);
		left_hand_cartman.setResponsiveRotation(PHI, THETA);
		right_hand_cartman.setResponsiveRotation(PHI, THETA);
		resleting_cartman.setResponsiveRotation(PHI, THETA);
		button1_cartman.setResponsiveRotation(PHI, THETA);
		button2_cartman.setResponsiveRotation(PHI, THETA);
		button3_cartman.setResponsiveRotation(PHI, THETA);
		mouth_cartman.setResponsiveRotation(PHI, THETA);
		head_kyle.setResponsiveRotation(PHI, THETA);
		left_eye_kyle.setResponsiveRotation(PHI, THETA);
		right_eye_kyle.setResponsiveRotation(PHI, THETA);
		left_blackeye_kyle.setResponsiveRotation(PHI, THETA);
		right_blackeye_kyle.setResponsiveRotation(PHI, THETA);
		mouth_kyle.setResponsiveRotation(PHI, THETA);
		hat_top_kyle.setResponsiveRotation(PHI, THETA);
		hat_middle_kyle.setResponsiveRotation(PHI, THETA);
		hat_left_kyle.setResponsiveRotation(PHI, THETA);
		hat_right_kyle.setResponsiveRotation(PHI, THETA);
		hat_back_kyle.setResponsiveRotation(PHI, THETA);
		body_kyle.setResponsiveRotation(PHI, THETA);
		left_arm_kyle.setResponsiveRotation(PHI, THETA);
		right_arm_kyle.setResponsiveRotation(PHI, THETA);
		right_elbow_kyle.setResponsiveRotation(PHI, THETA);
		left_elbow_kyle.setResponsiveRotation(PHI, THETA);
		left_forearm_kyle.setResponsiveRotation(PHI, THETA);
		right_forearm_kyle.setResponsiveRotation(PHI, THETA);
		left_hand_kyle.setResponsiveRotation(PHI, THETA);
		right_hand_kyle.setResponsiveRotation(PHI, THETA);
		left_thumb_kyle.setResponsiveRotation(PHI, THETA);
		right_thumb_kyle.setResponsiveRotation(PHI, THETA);
		left_leg_kyle.setResponsiveRotation(PHI, THETA);
		right_leg_kyle.setResponsiveRotation(PHI, THETA);
		left_shoe_kyle.setResponsiveRotation(PHI, THETA);
		right_shoe_kyle.setResponsiveRotation(PHI, THETA);
		pocket_square_left_kyle.setResponsiveRotation(PHI, THETA);
		pocket_square_right_kyle.setResponsiveRotation(PHI, THETA);
		pocket_triangle_left_kyle.setResponsiveRotation(PHI, THETA);
		pocket_triangle_right_kyle.setResponsiveRotation(PHI, THETA);
		back_sweater_kyle.setResponsiveRotation(PHI, THETA);
		front_sweater_left_kyle.setResponsiveRotation(PHI, THETA);
		front_sweater_right_kyle.setResponsiveRotation(PHI, THETA);
		wall.setResponsiveRotation(PHI, THETA);
		land.setResponsiveRotation(PHI, THETA);
		sticks.setResponsiveRotation(PHI, THETA);
		for (var i = 0; i < sticks.child.length; i++) {
			sticks.child[i].setResponsiveRotation(PHI, THETA);
		}
		sticks1.setResponsiveRotation(PHI, THETA);
		for (var i = 0; i < sticks1.child.length; i++) {
			sticks1.child[i].setResponsiveRotation(PHI, THETA);
		}
		sticks2.setResponsiveRotation(PHI, THETA);
		for (var i = 0; i < sticks2.child.length; i++) {
			sticks2.child[i].setResponsiveRotation(PHI, THETA);
		}

		sticks3.setResponsiveRotation(PHI, THETA);
		for (var i = 0; i < sticks3.child.length; i++) {
			sticks3.child[i].setResponsiveRotation(PHI, THETA);
		}

		//#endregion

		land.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		land.draw();

		sticks.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		sticks.draw();
		sticks1.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		sticks1.draw();
		sticks2.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		sticks2.draw();
		sticks3.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		sticks3.draw();

		wall.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		wall.draw();

		body.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body.draw();

		body_cartman.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body_cartman.draw();

		body_kyle.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body_kyle.draw();

		GL.flush();
		window.requestAnimationFrame(animate);
	};
	animate();
}

window.addEventListener("load", main);
