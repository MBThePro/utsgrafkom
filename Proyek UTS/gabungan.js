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
	segments = 20;
	
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
		if (i==75) object_vertex1.push(topX, topY, topZ, 0, 0, 0);
        else object_vertex1.push(topX, topY, topZ, 0.8745, 0.5412, 0.4784)
        
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
	segments = 100;
	object_vertex2.push(0, 0, 0,0.6980, 0.4314, 0.3843); // Center vertex for bottom circle
	object_vertex2.push(0, 0, height,0.6980, 0.4314, 0.3843); // Center vertex for top circle
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
		object_vertex2.push(bottomX, bottomY, bottomZ,0.6980, 0.4314, 0.3843);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex2.push(topX, topY, topZ,0.6980, 0.4314, 0.3843);
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
	segments = 800;
	object_vertex3.push(0, 0, 0,0.6980, 0.4314, 0.3843); // Center vertex for bottom circle
	object_vertex3.push(0, 0, height,0.6980, 0.4314, 0.3843); // Center vertex for top circle
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
		object_vertex3.push(bottomX, bottomY, bottomZ,0.6980, 0.4314, 0.3843);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex3.push(topX, topY, topZ,0.6980, 0.4314, 0.3843);
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

			object_vertex4.push(x, y, z,0.6980, 0.4314, 0.3843);
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
	stackCount = 100;
	sectorCount = 100;
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
	segments = 200;
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
	stackCount = 10; // Reduced to 1 for a flat circle
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
	stackCount = 10; // Reduced to 1 for a flat circle
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
	stackCount = 10; // Reduced to 1 for a flat circle
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

	//puffball
	stackCount=50;
    sectorCount=50;
    radius=0.25;
    object_vertex12 =[];
    for (var i = 0; i <= stackCount; ++i) {
            var theta = i * Math.PI / stackCount;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var j = 0; j <= sectorCount; ++j) {
                var phi = j * 2 * Math.PI / sectorCount;
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
	segments = 800;
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
	stackCount = 25; // Half the stack count for half sphere
sectorCount = 200;
radius = 1.22;
object_vertex15 = [];

for (var i = 0; i <= stackCount; ++i) {
    var theta = (i * Math.PI / stackCount) - (Math.PI / 2); // Shift by -pi/2 for half sphere
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);

    for (var j = 0; j <= sectorCount; ++j) {
        var phi = j * 2 * Math.PI / sectorCount;
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
    innerRad =0.01 ; // 
    height = 1.5;
    segments = 20;
    object_vertex16.push(0, 0, 0,0, 0, 0); // Center vertex for bottom circle
    object_vertex16.push(0, 0, height, 0, 0, 0); // Center vertex for top circle
    var angleIncrement = (2 * Math.PI) / segments;
    for (var i = 0; i <= segments; i++) { // Change the condition to <= to include the last segment
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
        object_faces16.push(index, index + 1, index + 3, index, index + 3, index + 2); // Side faces
    }
	// Closing faces for the bottom and top circles
	object_faces16.push(2, segments * 2 + 2, 0); // Bottom circle
	object_faces16.push(1, segments * 2 + 3, 3); // Top circle

	//buttons
	stackCount=50;
    sectorCount=50;
    radius=0.08;
    object_vertex17 =[];
    for (var i = 0; i <= stackCount; ++i) {
            var theta = i * Math.PI / stackCount;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var j = 0; j <= sectorCount; ++j) {
                var phi = j * 2 * Math.PI / sectorCount;
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = radius * cosPhi * sinTheta;
                var y = radius * cosTheta;
                var z = radius * sinPhi * sinTheta;

                object_vertex17.push(x, y, z, 0,0,0);
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
	segments = 800;
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
	stackCount = 20; // Reduced for half
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

	// head
	stackCount = 100;
	sectorCount = 100;
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
	stackCount = 10; // Reduced to 1 for a flat circle
	sectorCount = 50;
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
	stackCount = 10; // Reduced to 1 for a flat circle
	sectorCount = 50;
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
	stackCount = 100;
	sectorCount = 100;
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
	stackCount = 100;
	sectorCount = 100;
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
	stackCount = 100;
	sectorCount = 100;
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
	segments = 200;
	object_vertex8.push(0, 0, 0, 0.369, 0.204, 0); // Center vertex for bottom circle
	object_vertex8.push(0, 0, height, 0.369, 0.204, 0); // Center vertex for top circle
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
		object_vertex8.push(bottomX, bottomY, bottomZ, 0.369, 0.204, 0);

		// Top circle vertex
		var topX = innerRad * cosAngle;
		var topY = innerRad * sinAngle;
		var topZ = height; // For the top circle
		object_vertex8.push(topX, topY, topZ, 0.369, 0.204, 0);
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
	segments = 200;
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
	stackCount = 100;
	sectorCount = 100;
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
	stackCount = 100; // Reduced to 1 for a flat circle
	sectorCount = 100;
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
	stackCount = 10; // Reduced to 1 for a flat circle
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

	object_cartman.addChild(left_eye_cartman);
	object_cartman.addChild(right_eye_cartman);
	object_cartman.addChild(left_blackeye_cartman);
	object_cartman.addChild(right_blackeye_cartman);
	object_cartman.addChild(hat_cartman);
	object_cartman.addChild(yellowpart_cartman);
	object_cartman.addChild(pucukhat_cartman);
	object_cartman.addChild(mouth_cartman);

    object_cartman.moveChildrenWithParent(2, 0,0)

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

	//MAtrix
	var PROJMATRIX = LIBS.get_projection(
		40,
		CANVAS.width / CANVAS.height,
		1,
		100
	);
	var VIEWMATRIX = LIBS.get_I4();

	LIBS.translateZ(VIEWMATRIX, -10);

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
		object.setPosition(0, 0, 0, 0, 0, 0, PHI, THETA);
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

		//puffball
		hat_top.setPosition(-0.35, 0, 0, 0, 0.5, 1.5, PHI, THETA);

		//hat_middle
		hat_middle.setPosition(-0.35, 0, 0, 0, 0, 0.2, PHI, THETA);

		//hat_left
		hat_left.setPosition(
			1.22,
			0,
			0,
			0,
			0.05,
			0.2,
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

		//hat_top
		hat_back.setPosition(1.2, 0, 0, 0, 0, 0.2, PHI, THETA);

		//body
		body.setPosition(0, 0, 0, 0, 0, -2.7, PHI, THETA);

		//left_shoulder
		left_shoulder.setPosition(0, 0.6, 0, -0.8, 0, -1.65, PHI, THETA);

		//right_shoulder
		right_shoulder.setPosition(0, -0.6, 0, 0.8, 0, -1.65, PHI, THETA);

		//right_elbow
		right_elbow.setPosition(0, 0, 0, 0.82, 0, -1.7, PHI, THETA);

		//left_elbow
		left_elbow.setPosition(0, -0.15, 0, -0.82, 0, -1.7, PHI, THETA);

		//left_arm
		left_arm.setPosition(0, 0.15, 0, -0.9, 0, -2.2, PHI, THETA);

		//right_arm
		right_arm.setPosition(0, -0.15, 0, 0.9, 0, -2.2, PHI, THETA);

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


		//shirt_line
		shirt_line.setPosition(
			-0.33, 0, 0,
			0, -1, -2.7,
			PHI,
			THETA
		);

		button1.setPosition(
			0, 0, 0,
			-0.1, -0.6, -1.5,
			PHI,
			THETA
		);

		button2.setPosition(
			0, 0, 0,
			-0.1, -0.75, -1.9,
			PHI,
			THETA
		);

		button3.setPosition(
			0, 0, 0,
			-0.1, -0.9, -2.3,
			PHI,
			THETA
		);

		//pocket_triangle_right
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

        object_cartman.setPosition(0, 0, 0, 0, 0, 1, PHI, THETA);
		//left_eye
		left_eye_cartman.setPosition(Math.PI / 2 - 0.1, 0.3, 0, -0.3, -1.3, 1.2, PHI, THETA);

		//right_eye
		right_eye_cartman.setPosition(Math.PI / 2 - 0.1, -0.3, 0, 0.3, -1.3, 1.2, PHI, THETA);

		//left_blackeye
		left_blackeye_cartman.setPosition(Math.PI / 2, 0.5, 0, -0.2, -1.5, 1.2, PHI, THETA);

		//right_blackeye
		right_blackeye_cartman.setPosition(
			Math.PI / 2,
			-0.5,
			0,
			0.2,
			-1.5,
			1.2,
			PHI,
			THETA
		);

		//hat
		hat_cartman.setPosition(-0.4, 0, 0, 0, 0.05, 1.1, PHI, THETA);

		//body
		body_cartman.setPosition(0, 0, 0, 0, 0, -1.7, PHI, THETA);

		//yellowpart
		yellowpart_cartman.setPosition(-0.4, 0, 0, 0, 0.05, 1.1, PHI, THETA);

		//pucukhat
		pucukhat_cartman.setPosition(0, 0, 0, 0, 0.5, 2.4, PHI, THETA);

		//left_leg
		left_leg_cartman.setPosition(0, 0, 0, -0.48, 0, -2.2, PHI, THETA);

		//right_leg
		right_leg_cartman.setPosition(0, 0, 0, 0.48, 0, -2.2, PHI, THETA);

		//left_shoe
		left_shoe_cartman.setPosition(0.05, 0, 0, -0.48, -0.15, -2.28, PHI, THETA);

		//right_shoe
		right_shoe_cartman.setPosition(0.05, 0, 0, 0.48, -0.15, -2.28, PHI, THETA);

		//left_arm
		left_arm_cartman.setPosition(0, 1, 0, -2.1, 0, -0.85, PHI, THETA);

		//right_arm
		right_arm_cartman.setPosition(0, -1, 0, 2.1, 0, -0.85, PHI, THETA);

		//left_hand
		left_hand_cartman.setPosition(0, 1, 0, -2.2, 0, -0.9, PHI, THETA);

		//right_hand
		right_hand_cartman.setPosition(0, -1, 0, 2.2, 0, -0.9, PHI, THETA);

		//resleting
		resleting_cartman.setPosition(0, 0, 0, 0, -0.65, -1.7, PHI, THETA);

		//button1
		button1_cartman.setPosition(0, 0, 0, -0.2, -2, -1.4, PHI, THETA);

		//button2
		button2_cartman.setPosition(0, 0, 0, -0.2, -1.8, -0.7, PHI, THETA);

		//button3
		button3_cartman.setPosition(0, 0, 0, -0.2, -1.4, -0.1, PHI, THETA);

		//mouth
		mouth_cartman.setPosition(Math.PI / 2 + 1.3, -0.2, -0.5, 0, -1.14, 0.5, PHI, THETA);


		GL.viewport(0, 0, CANVAS.width, CANVAS.height);
		GL.clear(GL.COLOR_BUFFER_BIT);

        object.moveChildrenWithParent(-2, 0.5, 0)
		object.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		object.draw();

        body.moveChildrenWithParent(-2,0.5, 0)
		body.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body.draw();

        object_cartman.moveChildrenWithParent(2, 0, 0)
        object_cartman.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		object_cartman.draw();

        body_cartman.moveChildrenWithParent(2, 0, 0)
		body_cartman.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
		body_cartman.draw();
		GL.flush();
		window.requestAnimationFrame(animate);
	};
	animate();
}

window.addEventListener("load", main);
