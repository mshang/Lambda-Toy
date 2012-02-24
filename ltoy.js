// TODO:
// Add support for abbreviations.
// Use form so that hitting enter submits.
// Once a link is clicked, all other links on the same line should be disabled.

function Node(old_node) {
	this.type = null;
	this.value = null;
	// for "variable" type, holds the name of the variable
	// for "abstraction" type, holds the name of the bound variable
	this.child1 = null;
	this.child2 = null;
	this.parent = null;
	this.free_variables = new Array();
	this.bound_variables = new Array();
	
	if (old_node) {
		this.type = old_node.type;
		this.value = old_node.value;
		if (old_node.child1) {
			this.child1 = new Node(old_node.child1);
			this.child1.parent = this;
		}
		if (old_node.child2) {
			this.child2 = new Node(old_node.child2);
			this.child2.parent = this;
		}
		// variable lists are left empty. find_variables populates them recursively
	}
}

Node.prototype.find_variables = function () {
	if (this.child1) this.child1.find_variables();
	if (this.child2) this.child2.find_variables();
	
	this.free_variables = new Array();
	this.bound_variables = new Array();
	
	switch (this.type) {
	case "variable": // A lone-standing variable is free
		this.free_variables.push(this.value);
		break;
		
	case "abstraction":
		if (this.child1.free_variables.indexOf(this.value) == -1)
			throw "Ill-formed."
		this.free_variables = this.child1.free_variables.filter(function(value){return value != this.value;}, this); // Exclude this.value
		this.bound_variables = this.child1.bound_variables.filter(function(){return true;}); // Create a copy.
		this.bound_variables.push(this.value);
		break;
	
	case "application":
		this.free_variables = this.child1.free_variables.concat(this.child2.free_variables);
		this.bound_variables = this.child1.bound_variables.concat(this.child2.bound_variables);
		// There may be duplicates.
		break;
	}
}

var global_root;
var valid_names = "abcdefghijklmnopqrstuvwxyz";

function submit() {
	var input_string = document.getElementById("formula").value;
	
	var wf_field = document.getElementById("wf");
	var new_wf = document.createElement("span");
	new_wf.setAttribute("id", "wf");
	
	var reduction_field = document.getElementById("reduction");
	var new_reduction = document.createElement("span");
	new_reduction.setAttribute("id", "reduction");
	
	try {
		global_root = parse(input_string);
		global_root.find_variables();
		new_wf.appendChild(document.createTextNode("Well-formed."));
		print(global_root, new_reduction);
	} catch(err) {
		new_wf.appendChild(document.createTextNode(err));
	}
	
	wf_field.parentNode.replaceChild(new_wf, wf_field);
	reduction_field.parentNode.replaceChild(new_reduction, reduction_field);
}

function parse(str) {
	str = str.replace(/ /g,'');

	var root = new Node();
	var current = root;

	for(var i = 0; i < str.length; ++i) {
		switch(str[i]) {
		case '\\':
		case 'λ':
			current.type = "abstraction";
			current.child1 = new Node();
			current.child1.parent = current;
			
			++i;
			if (valid_names.indexOf(str[i]) == -1) throw "Ill-formed.";
			current.value = str[i];
			
			++i;
			if (str[i] != '[') throw "Ill-formed.";
			current = current.child1;
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
			if (!current.parent)
				throw "Ill-formed. Unexpected \"}\"";
			current = current.parent;
			if (current.type != "application") throw "Ill-formed.";
			++i;
			if (str[i] != '(') throw "Ill-formed.";
			current = current.child2;
			break;
			
		case '[': throw "Unexpected \"[\"."; break;
			
		case ']':
			if (!current.parent) throw "Ill-formed. Unexpected \"]\"";
			current = current.parent;
			if (current.type != "abstraction") throw "Ill-formed.";
			break;
			
		case '(': throw "Unexpected \"(\"."; break;
			
		case ')':
			if (!current.parent) throw "Ill-formed. Unexpected \")\"";
			current = current.parent;
			if (current.type != "application") throw "Ill-formed.";
			break;
			
		default:
			if (valid_names.indexOf(str[i]) == -1) throw "Ill-formed.";
			if (current.type) throw "Ill-formed.";
			current.type = "variable";
			current.value = str[i];
		}
	}
	
	if (current != root) throw "Ill-formed.";
	return root;
}

Node.prototype.reducible = function () { // This is run from the abstraction node.
	if (!this.parent) return false;
	if (this.parent.type != "application") return false;
	if (this.parent.child1 != this) return false;
	
	// For {\lambda x[M]}(N), x and the free symbols of N cannot be bound symbols of M
	var x = this.value;
	var M = this.child1;
	var N = this.parent.child2;
	if (M.bound_variables.indexOf(x) != -1) return false;
	for (var i = 0; i < N.free_variables; ++i)
		if (M.bound_variables.indexOf(N.free_variables[i]) != -1)
			return false;
	return true;
};

Node.prototype.recursive_reduce = function (new_node, old_symbol) {
	// old_symbol cannot be bound anywhere in M,
	// so no need to treat the case of abstraction
	
	if (this.type == "variable") {
		if (this.value == old_symbol) {
			// no need to consider the case of no parent
			// because we start at a node that has a parent and go down
			if (this == this.parent.child1) {
				this.parent.child1 = new Node(new_node);
				this.parent.child1.parent = this.parent;
			}
			if (this == this.parent.child2) {
				this.parent.child2 = new Node(new_node);
				this.parent.child2.parent = this.parent;
			}
		}
	}
	
	if (this.child1) this.child1.recursive_reduce(new_node, old_symbol);
	
	if (this.child2) this.child2.recursive_reduce(new_node, old_symbol);
};

Node.prototype.reduce = function () { // This is run from the application node.
	this.child1.child1.recursive_reduce(this.child2, this.child1.value);
	
	if (this.parent) {
		if (this == this.parent.child1)
			this.parent.child1 = this.child1.child1;
		if (this == this.parent.child2)
			this.parent.child2 = this.child1.child1;
	} else {
		global_root = this.child1.child1;
		global_root.parent = null;
	}
	
	global_root.find_variables();
	print(global_root, document.getElementById("reduction"));
};

Node.prototype.find_next_valid_name = function () {
	var i = 0;
	for (; this.value != valid_names[i]; ++i) {}
	++i;
	if (i == valid_names.length) i = 0;
	for (; this.value != valid_names[i]; ++i) {
		if (i == valid_names.length) i = 0;
		if (this.child1.free_variables.indexOf(valid_names[i]) == -1)
			if (this.child1.bound_variables.indexOf(valid_names[i]) == -1)
				break;	
	}
	return valid_names[i];
};

Node.prototype.renamable = function () {
	// Make sure there are letters remaining in the alphabet
	var next_valid_name = this.find_next_valid_name();
	if (next_valid_name == this.value)
		return false;
	return true;
};

Node.prototype.recursive_rename = function (new_name, old_name) {
	if (this.child1) this.child1.recursive_rename(new_name, old_name);
	if (this.child2) this.child2.recursive_rename(new_name, old_name);
	if (this.value == old_name) this.value = new_name;
};

Node.prototype.rename = function () {
	var next_valid_name = this.find_next_valid_name();
	this.recursive_rename(next_valid_name, this.value);
	global_root.find_variables();
	print(global_root, document.getElementById("reduction"));
};

function print(root, span) {
	var new_line = document.createElement("span");
	root.stringify(new_line);
	span.appendChild(new_line);
	span.appendChild(document.createElement("br"));
}

Node.prototype.stringify = function (span) {
	switch (this.type) {
	case "variable":
		span.appendChild(document.createTextNode(this.value));
		break;
		
	case "abstraction":
		if (this.reducible()) {
			var link = document.createElement("a");
			link.appendChild(document.createTextNode("λ"));
			link.setAttribute("href", "#");
			link.refers_to = this.parent;
			link.addEventListener("click", function(){this.refers_to.reduce()});
			span.appendChild(link);
		} else {
			span.appendChild(document.createTextNode("λ"));
		}
		
		if (this.renamable()) {
			var link = document.createElement("a");
			link.appendChild(document.createTextNode(this.value));
			link.setAttribute("href", "#");
			link.refers_to = this;
			link.addEventListener("click", function(){this.refers_to.rename()});
			span.appendChild(link);
		} else {
			span.appendChild(document.createTextNode(this.value));
		}
		
		span.appendChild(document.createTextNode("["));
		this.child1.stringify(span);
		span.appendChild(document.createTextNode("]"));
		break;
		
	case "application":
		span.appendChild(document.createTextNode("{"));
		this.child1.stringify(span);
		span.appendChild(document.createTextNode("}("));
		this.child2.stringify(span);
		span.appendChild(document.createTextNode(")"));
		break;
	}
};
