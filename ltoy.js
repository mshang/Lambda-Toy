function Node() {
	this.type = null;
	this.value = null;
	this.child1 = null;
	this.child2 = null;
	this.parent = null;
	this.variables = new Array();
}

var str = "{\\x[{x}(x)]}(    \\x[{x}(x)])";

str = str.replace(/ /g,'');
document.write(str);

var root = new Node();
var current = root;

for(var i = 0; i < str.length; ++i) {
	switch(str[i]) {
		case '\\':
			current.type = "abstraction";
			current.child1 = new Node();
			current.child2 = new Node();
			current.child1.parent = current;
			current.child2.parent = current;
			
			++i;
			if (str[i].search(/[a-zA-Z]/) == -1)
				throw "Ill-formed.";
			current.child1.type = "variable";
			current.child1.value = str[i];
			break;
			
		case '{':
			current.type = "application";
			current.child1 = new Node();
			current.child2 = new Node();
			current.child1.parent = current;
			current.child2.parent = current;
			current = current.child1;
			break;
			
		case '}':
			current = current.parent;
			break;
			
		case '[':
			if (current.type != "abstraction")
				throw "Ill-formed";
			current = current.child2;
			break;
			
		case ']':
			current = current.parent;
			if (current.type != "abstraction")
				throw "Ill-formed";
			break;
			
		case '(':
			if (current.type != "application")
				throw "Ill-formed";
			current = current.child2;
			break;
			
		case ')':
			current = current.parent;
			if (current.type != "application")
				throw "Ill-formed";
			break;
			
		default:
			if (str[i].search(/[a-zA-Z]/) == -1)
				throw "Ill-formed.";
			if (current.type)
				throw "Ill-formed.";
			current.type = "variable";
			current.value = str[i];
	}
}