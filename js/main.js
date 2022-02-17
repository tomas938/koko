import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import bg from "../bg.png";
import vertex from "./shaders/vertex.glsl";
import fragment from "./shaders/fragment.glsl";
import noise from "./shaders/noise.glsl";
import Scroll from "./scroll";
export default class sketch {
	constructor(options) {
		this.time = 0;
		this.container = options.dom;
		this.scene = new THREE.Scene();

		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;

		this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 100, 2000);
		this.camera.position.z = 600;

		this.camera.fov = 2 * Math.atan(this.height / 2 / 600) * (180 / Math.PI);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setSize(this.width, this.height);
		this.container.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.images = [...document.querySelectorAll("img")];

		// const fontOpen = new Promise((resolve) => {
		// 	new FontFaceObserver("Roboto").load().then(() => {
		// 		resolve();
		// 	});
		// });

		// const fontPlayfair = new Promise((resolve) => {
		// 	new FontFaceObserver("Playfair Display").load().then(() => {
		// 		resolve();
		// 	});
		// });

		const preloadImages = new Promise((resolve, reject) => {
			imagesLoaded(document.querySelectorAll("img"), { backgorund: true }, resolve);
		});

		let allDone = [preloadImages];
		this.currentScroll = 0;
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		Promise.all(allDone).then(() => {
			this.scroll = new Scroll();
			this.addImages();
			this.setPosition();
			this.mouseMovement();
			this.resize();
			this.setupResize();
			this.composerPass();
			// this.addObjects();
			this.render();
		});
	}
	mouseMovement() {
		window.addEventListener(
			"mousemove",
			(event) => {
				this.mouse.x = (event.clientX / this.width) * 2 - 1;
				this.mouse.y = -(event.clientY / this.height) * 2 + 1;
				this.raycaster.setFromCamera(this.mouse, this.camera);

				// calculate objects intersecting the picking ray
				const intersects = this.raycaster.intersectObjects(this.scene.children);

				if (intersects.length > 0) {
					let obj = intersects[0].object;
					obj.material.uniforms.hover.value = intersects[0].uv;
				}
			},
			false
		);
	}
	setupResize() {
		window.addEventListener("resize", this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}
	addImages() {
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				time: { value: 0 },
				uImage: { value: 0 },
				hover: { value: new THREE.Vector2(0.5, 0.5) },
				hoverState: { value: 0 },
				bgTexture: { value: new THREE.TextureLoader().load(bg) },
			},
			side: THREE.DoubleSide,
			fragmentShader: fragment,
			vertexShader: vertex,
			// wireframe: true,
		});
		this.materials = [];
		this.imageStore = this.images.map((img) => {
			let bounds = img.getBoundingClientRect();

			let geometry = new THREE.PlaneBufferGeometry(bounds.width, bounds.height, 10, 10);
			const texture = new THREE.TextureLoader().load(img.src);
			// let material = new THREE.MeshBasicMaterial({ map: texture, color: "red" });

			let material = this.material.clone();

			img.addEventListener("mouseenter", () => {
				gsap.to(material.uniforms.hoverState, {
					duration: 1,
					value: 1,
				});
			});
			img.addEventListener("mouseout", () => {
				gsap.to(material.uniforms.hoverState, {
					duration: 1,
					value: 0,
				});
			});

			material.uniforms.uImage.value = texture;

			this.materials.push(material);

			let mesh = new THREE.Mesh(geometry, material);

			this.scene.add(mesh);

			return {
				img: img,
				mesh: mesh,
				top: bounds.top,
				left: bounds.left,
				width: bounds.width,
				height: bounds.height,
			};
		});
	}
	composerPass() {
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);

		const counter = 0.0;
		this.myEffect = {
			uniforms: {
				tDiffuse: { value: null },
				scrollSpeed: { value: null },
				time: { value: null },
			},
			vertexShader: `varying vec2 vUv;
		void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
		`,
			fragmentShader: `uniform sampler2D tDiffuse;
			varying vec2 vUv;
			uniform float scrollSpeed;
			uniform float time;
			${noise}
			void main(){
			vec2 newUv = vUv;
			float area = smoothstep(1.,0.8,vUv.y) * 2. - 1.;
			// area = pow(area,4.);
			float noise = 0.5*(cnoise(vec3(vUv*10.,time / 5.)) + 1.);
			float n = smoothstep(0.5,0.51,noise + area);
			newUv.x += (vUv.x - 0.5) * 0.1 * area * scrollSpeed	;
			gl_FragColor = texture2D(tDiffuse,newUv);
			//  gl_FragColor = vec4(n,0.,0.,1.);
			gl_FragColor = mix(vec4(1.),texture2D(tDiffuse,newUv), n);

		}`,
		};
		this.customPass = new ShaderPass(this.myEffect);
		this.customPass.renderToScreen = true;

		this.composer.addPass(this.customPass);
	}
	setPosition() {
		this.imageStore.forEach((o) => {
			o.mesh.position.y = this.currentScroll - o.top + this.height / 2 - o.height / 2;
			o.mesh.position.x = o.left - this.width / 2 + o.width / 2;
		});
	}
	addObjects() {
		this.geometry = new THREE.PlaneBufferGeometry(100, 100, 10, 10);
		this.material = new THREE.MeshNormalMaterial();

		this.material = new THREE.ShaderMaterial({
			uniforms: {
				time: { value: 0 },
				bgTexture: { value: new THREE.TextureLoader().load(bg) },
			},
			side: THREE.DoubleSide,
			fragmentShader: fragment,
			vertexShader: vertex,
			wireframe: true,
		});

		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	}
	render() {
		this.time += 0.05;
		this.scroll.render();
		this.currentScroll = this.scroll.scrollToRender;
		this.setPosition();
		this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget;
		this.customPass.uniforms.time.value = this.time;
		this.materials.forEach((m) => {
			m.uniforms.time.value = this.time;
		});

		// this.renderer.render(this.scene, this.camera);
		this.composer.render();
		window.requestAnimationFrame(this.render.bind(this));
	}
}
new sketch({
	dom: document.getElementById("container"),
});
