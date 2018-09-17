/**
 * @author Vitaly Dmitriev, 2016
 */
'use strict';
String.prototype.trim = String.prototype.trim || function(){return this;};

function W3View(appContext){
	var registry = {};
	var factory = this;
	var mixin = {};

	this.getRegistry = function(){
		var result={};
		for(var k in registry)
			if(!registry[k].builtin) result[k]=registry[k];
		return result;
	};
	this.setRegistry = function(newRegistry){
		for(var k in newRegistry)
			registry[k]=newRegistry[k]; 
		return factory;
	};
	this.putModule = function(name, module){
		name = name.toUpperCase();
		modules[name] = module;
	};
	
	/**
	 * 
	 */
	var modules = {};

	var document = W3View.document || window.document;
	/**
	 * Mount element into target content
	 * at index position
	 * 
	 * @param {DOMNode} target - destination target
	 * @param {number} index - index in destination
	 */
	mixin.mount=function(target, index){
		target = target.ref && target.ref.content ? target.ref.content : target;
		this.unmount();
		if(index === undefined || target.children.length <= index ) 
			target.appendChild(this);
		else target.insertBefore(this,target.children[index < 0 ? 0 : index]);
		this.onMount();
	};
	/**
	 * Unmount element from DOM tree
	 */
	mixin.unmount=function(){
		this.onUnmount();
		if(this.parentNode) this.parentNode.removeChild(this);
	}
	/**
	 * setData - public API methods for
	 * setting data into element, user defined onSetData callback will
	 * be called immediately
	 * 
	 * @param {any} data
	 * @param {any} opts
	 * @param {any} a1
	 */
	mixin.setData=function(data,opts,a1){
		this.onSetData(data,opts,a1);
	};
	/**
	 * recursively destroy self and subtree
	 */
	mixin.destroy=function(){
		if(this.unmount){
			this.unmount();
		} else this.parentNode.removeChild(this);
		if(this.onDestroy){
			this.onDestroy();
		}
		while(this.children.length){
			if(!this.children[0].destroy){
				this.children[0].destroy = mixin.destroy;
			} 
			this.children[0].destroy();
		}
	};

	///lifecycle callbacks
	/**
	 * all of these callbacks already presented in each
	 * instance of W3View components.
	 * Author of component can override each of them.
	 */
	/**
	 * callback on this.setData
	 */
	mixin.onSetData=function(data,opts){};

	/**
	 * callbacks on element.mount and element.unmount
	 * in this time you can touch parentElement if needed,
	 * onMount will be called after inserting into DOM tree
	 * onUnmount - before removing
	 */
	mixin.onMount=function(){};
	mixin.onUnmount=function(){};

	/**
	 * callback called immediately after element created
	 * before mount 
	 */
	mixin.onCreate=function(){};
	/**
	 * callback called when destroy
	 * Please cleanup all references to this,
	 * including callbacks, placed into any kind of dispatchers,
	 * observables and event listeners
	 */
	mixin.onDestroy=function(){};
	
	this.findPrep=function(find){
		var name=(find + '').toUpperCase();
		return (registry[name] && registry[name].prep) ? registry[name].prep : undefined;
	};

	var initInstance=function(instance, name){
		var prep = factory.findPrep(name);
		if(prep){
			if(prep.superc){
				initInstance(instance,prep.superc);
			}
			if(prep.script){
				instance.__ = prep.script;
				instance.__(appContext,factory,document);
				instance.onCreate();
			}
		}
	};
	/**
	 * Make preparat from sample HTMLElement
	 */
	function nmToObj(nm){
		var res = {};
		for(var i=0;i<nm.length;i++){
			res[nm[i].name.toLowerCase()]=nm[i].value;
		}
		return res;
	}

	function setAttributes(instance, attr){
		if(attr && instance && instance.setAttribute)
		for(var key in attr){
			instance.setAttribute(key, attr[key]);
		}
	}

	function prepare (root){
		var res={};
		res.tgn=root.getAttribute('tagname') || root.tagName;
		res.as=root.getAttribute('as');
		res.attr=nmToObj(root.attributes);
		if(res.attr.ref) {res.attr._ref=res.attr.ref; delete res.attr.ref;}
		res.ch=[];
		res.superc = root.getAttribute('super');
		var ch=root.childNodes;
		for(var i=0; i < ch.length; i++){
			var cChild = ch[i];
			var textContent = cChild.textContent || cChild.innerHTML || cChild.nodeValue || '';
			if(cChild.nodeType > 3) continue;
			if(!cChild.tagName){
				if(textContent.trim())
					res.ch.push(textContent);
				continue;
			}
			var tgn=cChild.tagName.toUpperCase();
			if(tgn==='CONSTRUCTOR' || tgn==='SCRIPT'){
				var construct="\n"+(textContent)+
					"\n//# sourceURL=W3View:///"+(factory.src?factory.src:'')+"<"+res.as+">";
				res.script = new Function('appContext,factory,document', construct);
			} else {
				var child = prepare(cChild);
				delete child.script;
				delete child.as;
				res.ch.push(child);
			}
		}
		return res;
	}
	
	/**
	 * register Components, takes definitions from
	 * string, append new definitions into registry
	 * @param {string} str
	 * @returns {void} 
	 */
	factory.parse=function(str){
		var matrix=document.createElement('div');
		matrix.innerHTML=str;
		var ch=matrix.children;
		factory.register(ch);
	};


	factory.register = function(ch){
		for(var i=0;i<ch.length;i++){
			if(ch[i].tagName.toUpperCase()==='IMPORT' && ch[i].getAttribute('type') &&
					ch[i].getAttribute('type').toLowerCase()==='html'){
				factory.imports =factory.imports || [];
				factory.imports.push(
					{src:ch[i].getAttribute('src'), name:ch[i].getAttribute('as')}
				);
				continue;
			}
			var asName=(ch[i].getAttribute('as') || '').toUpperCase();
			if( asName ) {
				if(!registry[asName]){
					var prep = prepare(ch[i]);
					registry[asName]={};
					registry[asName].prep=prep;
				} else {
					console.error(asName + ' - already registered component')
				}
			}
		}
	};

	function makeFromPrep(tagname, prep){
		//создаём инстанс 
		var instance=document.createElement(tagname);
		instance.as=prep.as;
		//назначить ссылку на элемент для вставки контента,
		//по умолчанию - на самого себя 
		instance.ref={content:instance};
		//*/
		//если в препарате указаны атрибуты
		//пройти и установить их в инстанс
		setAttributes(instance, prep.attr);
		//если в препарате указаны вложенные ноды
		//пройти и добавить их
		if(prep.ch && prep.ch.length)
		for(var i=0;i < prep.ch.length;i++){
			//если нода текстовая
			if(!prep.ch[i].tgn){
				//создать и установить её
				instance.appendChild(document.createTextNode(prep.ch[i]));
				continue;
			}
			//иначе создать ноду этой фабрикой,
			//указывая в качестве корня себя и
			//в качестве параметров ноды - атрибуты и 
			//вложенные ноды из её описания в инстансе
			var cch=factory.create(prep.ch[i].tgn, prep.ch[i].attr, prep.ch[i].ch,instance);
			//если у созданной ноды есть атрибут ref
			//добавить ссылку на ноду в ref инстанса
			var ref=cch.getAttribute('_ref');
			if(ref){
				instance.ref[ref]=cch;
			}
			//добавить ноду в инстанс 
			instance.appendChild(cch);
			if (cch.onMount) cch.onMount();
		}
		//*/
		return instance;
	}

	/**
	 * Magic method, - factory of components - 
	 * does all dirty work at DOM nodes creation,
	 * attribute setting, adding children and references registration
	 */
	factory.create=function(name, attr, ch, root){
		var instance;
		var prep=this.findPrep(name);
		if(prep){
			if(factory.findPrep(prep.tgn)){
				instance = factory.create(prep.tgn, prep.attr, prep.ch);
			} else {
				var tagname = (attr && attr.usetag) ? attr.usetag : prep.tgn;
				instance = makeFromPrep(tagname, prep);
			}
		} 
		else {
			var path = name.toUpperCase().split(':');
			if(path.length>1 && modules[path[0]]){ 
				instance = modules[path[0]].create(
					path.slice(1).join(':'),
					attr, ch, root
				);
				instance.fullTgn = name;
				return instance;
			}
			instance=document.createElement(name);
			instance.ref={content:instance};
		}
		if(!root) root=instance;
		setAttributes(instance, attr);
		if(ch && ch.length)
		for(var i = 0; i < ch.length; i++){
			if(!ch[i].tgn){
				instance.ref.content.appendChild(document.createTextNode(ch[i]));
				continue;
			}
			var cch=factory.create(ch[i].tgn, ch[i].attr, ch[i].ch, root);
			var ref=cch.getAttribute('_ref');
			if(ref){
				root.ref=root.ref || {};
				root.ref[ref]=cch;
			}
			if(cch.mount){
				cch.mount(instance);
			} else {
				instance.ref.content.appendChild(cch);
			}
		}

		if(prep){
			for(var k in mixin){
				instance[k] = instance[k] || mixin[k];
			}
			initInstance(instance, name);
		}

		instance.destroy = mixin.destroy;
		return instance;
	};

	factory.byExample = function byExample(tpl){
		if(!tpl.as){
			throw new Error('Sample should be registered component');
		}
		var attrs = {};
		for(var i=0;i<tpl.attributes.length;i++){
			var att=tpl.attributes[i];
			if(tpl[att.name] && typeof tpl[att.name]==='function'){
				continue;
			}
			attrs[att.name]=att.value;
		}
		var res = factory.create(tpl.fullTgn || tpl.as, attrs);
		return res;
	};

	///builtin components
	//ARRAY-ITERATOR
	factory.parse('<div as="ARRAY-ITERATOR"></div>');
	registry['ARRAY-ITERATOR'].builtin=true;
	factory.findPrep('ARRAY-ITERATOR').script = function(appContext,factory,document){
		var templates=[];
		while(this.children.length > 0){
			templates.push(this.removeChild(this.children[0]));
		}

		this.onSetData = function(array, opts){
			if(!array) array=[];
			if(!Array.isArray(array)) {
				array=[array];
			}
			for(var i=0; i < array.length || i < this.children.length; i++){
				if(this.children[i] && array.length <= i){
					this.children[i].destroy();
					i--;
					continue;
				}
				var item = array[i];
				var child=this.children[i];
				if(!child){
				  child=factory.byExample(templates[i%templates.length]);
					child.mount(this);
				}
				child.setData(item, opts, i);
			}
		}
	};
};

if(typeof (module) === 'object'){
	module.exports = W3View;
}
