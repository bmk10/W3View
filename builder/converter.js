'use strict';

module.exports = function(factory){

	if(!factory.getRegistry) return;
	const registry = factory.getRegistry();

	let buffer=[];

	for(let key in registry){
		let prep = registry[key].prep;
		let script = prep.script;
		if(script){
			script = script.toString();
			prep.script = 'hgfFjgjfhg3644%$#*%^86%*%*&%*%@##/'+Math.random()+'/!!!';
		}
		let prepS = JSON.stringify(prep).replace('"'+prep.script+'"', script);
		buffer.push("\""+key+"\":{\"prep\":"+prepS+"}");
	}

	const registryS = "{"+buffer.join(',\n')+"}";

	buffer=[];

	buffer.push('function(appContext){');
	buffer.push('return new W3View(appContext)');
	buffer.push('.setRegistry('+registryS+');');
	buffer.push('}');

	return buffer.join("\n");
};
