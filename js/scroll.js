const lerp = (a, b, n) => (1 - n) * a + n * b;

export default class scroll {
	constructor() {
		this.DOM = { main: document.querySelector("main") };
		this.DOM.scrollable = this.DOM.main.querySelector("div[data-scroll]");
		this.docScroll = 0;
		this.scrollToRender = 0;
		this.current = 0;
		this.ease = 0.1;
		this.speed = 0;
		this.speedTarget = 0;

		this.setSize();
		this.getScroll();
		this.init();
		this.style();
		this.initEvents();
		requestAnimationFrame(() => this.render());
	}
	init() {
		for (const key in this.renderStyles) {
			this.current = this.scrollToRender = this.getScroll();
		}
		this.setPosition();
		this.shouldRender = true;
	}
	style() {
		this.DOM.main.style.position = "fixed";
		this.DOM.main.style.width = this.DOM.main.style.height = "100%";
		this.DOM.main.style.top = this.DOM.main.style.left = 0;
		this.DOM.main.style.overflow = "hidden";
	}
	getScroll() {
		this.docScroll = window.pageYOffset || document.documentElement.scrollTop;
		return this.docScroll;
	}
	initEvents() {
		window.onbeforeunload = function () {
			window.scrollTo(0, 0);
		};
		window.addEventListener("resize", () => {
			this.setSize();
		});
		window.addEventListener("scroll", this.getScroll.bind(this));
	}
	setSize() {
		document.body.style.height = `${this.DOM.scrollable.scrollHeight}px`;
	}
	setPosition() {
		if (Math.round(this.scrollToRender) !== Math.round(this.current) || this.scrollToRender < 10) {
			this.DOM.scrollable.style.transform = `translate3d(0, ${-1 * this.scrollToRender}px,0)`;
		}
	}
	render() {
		this.speed = Math.min(Math.abs(this.current - this.scrollToRender), 200) / 200;
		this.speedTarget += (this.speed - this.speedTarget) * 0.2;
		this.current = this.getScroll();
		this.scrollToRender = lerp(this.scrollToRender, this.current, this.ease);
		this.setPosition();
	}
}
