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

	// object 1
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

	// object 2
	stackCount = 100;
	sectorCount = 100;
	radiusX = 1.5; // Radius along x-axis
	radiusY = 1.35; // Radius along y-axis
	radiusZ = 1.4; // Set to a small value for a flat circle
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
			if (z >= -2.2) {
				object_vertex2.push(x, y, z, 0, 0, 1);
			}
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

    // object 3
	stackCount = 100;
	sectorCount = 100;
	radiusX = 1.5; // Radius along x-axis
	radiusY = 1.35; // Radius along y-axis
	radiusZ = 1.4; // Set to a small value for a flat circle
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
			if (z >= -2.2) {
				object_vertex3.push(x, y, z, 0.984, 1, 0);
			}
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

    // ball
	stackCount = 100;
	sectorCount = 100;
	radiusX = 0.5; // Radius along x-axis
	radiusY = 0.35; // Radius along y-axis
	radiusZ = 0.4; // Set to a small value for a flat circle
	object_vertex4 = [];
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
				object_vertex4.push(x, y, z, 1, 0, 0);
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
	
	var object = new MyObject(
		object_vertex,
		object_faces,
		shader_vertex_source,
		shader_fragment_source
	);

    var object2 = new MyObject(
		object_vertex2,
		object_faces2,
		shader_vertex_source,
		shader_fragment_source
	);

    var object3 = new MyObject(
		object_vertex3,
		object_faces3,
		shader_vertex_source,
		shader_fragment_source
	);

    var object4 = new MyObject(
		object_vertex4,
		object_faces4,
		shader_vertex_source,
		shader_fragment_source
	);


	//MAtrix
	var PROJMATRIX = LIBS.get_projection(
		40,
		CANVAS.width / CANVAS.height,
		1,
		100
	);
	var VIEWMATRIX = LIBS.get_I4();

	LIBS.translateZ(VIEWMATRIX, -20);

	//DRAWING
	GL.clearColor(0.0, 0.0, 0.0, 0.0);
	GL.enable(GL.DEPTH_TEST);
	GL.enable(GL.BLEND);
	GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
	GL.depthFunc(GL.LEQUAL);

	GL.clearDepth(1.0);
	var time_prev = 0;
	var xTranslation = -10; // Initial translation value
    var direction = 1; // Initial direction of movement

    var xTranslation2 = 8.5; // Initial translation value
    var direction2 = 1; // Initial direction of movement

    var xTranslation3 = 5; // Initial translation value
    var direction3 = -1; // Initial direction of movement

    var t = 0; // Parameter for the curve (0 to 1)
    var direction4 = 1; // Initial direction of movement

    var animate = function (time) {
        var dt = time - time_prev;
        if (!drag) {
            dX *= AMORTIZATION;
            dY *= AMORTIZATION;
            THETA += dX;
            PHI += dY;
        }

        // Adjust xTranslation based on direction
        xTranslation += direction * 0.013; // Adjust the speed of movement here
        xTranslation2 += direction2 * 0.013;
        xTranslation3 += direction3 * 0.02;

        // Check if within bounds, otherwise reverse direction
        if (xTranslation >= -8.5) {
            direction = -1;
        } else if (xTranslation <= -10) {
            direction = 1;
        }

        if (xTranslation2 >= 10) {
            direction2 = -1;
        } else if (xTranslation2 <= 8.5) {
            direction2 = 1;
        }

        if (xTranslation3 <= -5) {
            direction3 = 1;
        } else if (xTranslation3 >= 5) {
            direction3 = -1;
        }

        // Update the parameter for the curve
        t += direction4 * 0.003; // Adjust the speed of movement here

        // Ensure t stays within the range [0, 1]
        if (t > 1) {
            t = 1;
            direction4 = -1; // Reverse direction
        } else if (t < 0) {
            t = 0;
            direction4 = 1; // Reverse direction
        }

        // Calculate the position on the quadratic Bézier curve
        var xCurve = (1 - t) * ((1 - t) * 6 + t * 0) + t * ((1 - t) * 0 + t * -6);
        var yCurve = (1 - t) * ((1 - t) * 0 + t * 10) + t * ((1 - t) * 10 + t * 0);

        // Set object position
        object.setPosition(0, 0, 0, xTranslation, 0, 0, PHI, THETA);
        object2.setPosition(0, 0, 0, xTranslation2, 0, 0, PHI, THETA);
        object3.setPosition(0, 0, 0, xTranslation3, 0, 0, PHI, THETA);
        object4.setPosition(0, 0, 0, xCurve, 0, yCurve, PHI, THETA);

        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        object.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
        object.draw();

        object2.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
        object2.draw();

        object3.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
        object3.draw();

        object4.setuniformmatrix4(PROJMATRIX, VIEWMATRIX);
        object4.draw();

        GL.flush();
        window.requestAnimationFrame(animate);
    };
	animate();
}

window.addEventListener("load", main);