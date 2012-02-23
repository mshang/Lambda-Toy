function Node() {
	this.type = null;
	this.bound_variable = null;
	this.child1 = null;
	this.child2 = null;
	this.parent = null;
	this.variables = new Object();
}

Node.prototype.pass_variables_up = function () {
	for (var name in this.variables) {
		if (this.variables.hasOwnProperty(name)) {
			if (this.parent.variables.hasOwnProperty(name)) {
				this.parent.variables[name].free = this.variables[name].free || this.parent.variables[name].free;
				this.parent.variables[name].bound = this.variables[name].bound || this.parent.variables[name].bound;
			} else {
				this.parent.variables[name] = { free : this.variables[name].free, bound : this.variables[name].bound };
			}
		}
	}
}

function submit() {
	var input_string = document.getElementById("formula").value;
	var root;
	try {
		root = parse(input_string);
		var wf_field = document.getElementById("wf");
		wf_field.replaceChild(document.createTextNode("Well-formed."), wf_field.firstChild);
	} catch(err) {
		var wf_field = document.getElementById("wf");
		wf_field.replaceChild(document.createTextNode(err), wf_field.firstChild);
	}
}

function parse(str) {
	str = str.replace(/ /g,'');

	var root = new Node();
	var current = root;

	for(var i = 0; i < str.length; ++i) {
		switch(str[i]) {
			case '\\':
				current.type = "abstraction";
				current.child1 = new Node();
				current.child1.parent = current;
				
				++i;
				if (str[i].search(/[a-zA-Z]/) == -1)
					throw "Ill-formed.";
				current.bound_variable = str[i];
				
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
				current.pass_variables_up();
				current = current.parent;
				if (current.type != "application")
					throw "Ill-formed.";
				break;
				
			case '[':
				if (current.type != "abstraction")
					throw "Ill-formed.";
				current = current.child1;
				break;
				
			case ']':
				current.pass_variables_up();
				current = current.parent;
				if (current.type != "abstraction")
					throw "Ill-formed.";
					
				if (!current.variables[current.bound_variable])
					throw "Ill-formed.";
				if (!current.variables[current.bound_variable].free)
					throw "Ill-formed.";
				current.variables[current.bound_variable].free = false;
				current.variables[current.bound_variable].bound = true;
				break;
				
			case '(':
				if (current.type != "application")
					throw "Ill-formed.";
				current = current.child2;
				break;
				
			case ')':
				current.pass_variables_up();
				current = current.parent;
				if (current.type != "application")
					throw "Ill-formed.";
				break;
				
			default:
				if (str[i].search(/[a-zA-Z]/) == -1)
					throw "Ill-formed.";
				if (current.type)
					throw "Ill-formed.";
				current.type = "variable";
				current.variables[str[i]] = { free : true, bound : false };
		}
	}
	
	if (current != root)
		throw "Ill-formed.";
	return root;
}
