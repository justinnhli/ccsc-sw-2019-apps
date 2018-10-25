from itertools import chain, product
from fractions import Fraction


def my_product(l):
    result = 1
    for e in l:
        result *= e
    return result


class Node:

    def __init__(self, name):
        self.name = name
        self.parents = []
        self.children = set()
        self.depth = 0
        self.values = []
        self.cpt = []
        self.observation = None
        self.posterior = {}
        self.reset()

    def reset(self):
        self.observation = None
        self.posterior = {}

    def observe(self, value):
        for v in self.values:
            self.posterior[v] = 0
        self.observation = value
        self.posterior[value] = 1

    def is_ancestor(self, node):
        if self == node:
            return True
        else:
            return any(parent.is_ancestor(node) for parent in self.parents)

    def cpt_string(self):
        result = []
        key_table = []
        prob_table = []
        values_header = tuple("P({})".format(value) for value in self.values)
        for key, probs in self.cpt:
            key = dict(key)
            probs = dict(probs)
            key_table.append(tuple(key[parent.name] for parent in self.parents))
            prob_table.append(["{:.2f}%".format(float(100 * probs[value])) for value in self.values])
        key_widths = tuple(
            max(len(row[col]) for row in chain(([parent.name for parent in self.parents], ), key_table))
            for col in range(len(self.parents))
        )
        prob_widths = tuple(
            max(len(row[col]) for row in chain((values_header, ), prob_table))
            for col in range(len(self.values))
        )
        result.append(self.name)
        result.append("".join([
            "|",
            "|".join(
                " {} ".format(col.ljust(key_widths[i]))
                for i, col in enumerate(parent.name for parent in self.parents)
            ),
            "||",
            "|".join(
                " {} ".format(col.ljust(prob_widths[i]))
                for i, col in enumerate(values_header)
            ),
            "|",
        ]))
        result.append("".join([
            "|",
            "|".join((width + 2) * "=" for width in key_widths),
            "||",
            "|".join((width + 2) * "=" for width in prob_widths),
            "|",
        ]))
        for keys, probs in zip(key_table, prob_table):
            result.append("".join([
                "|",
                "|".join(
                    " {} ".format(col.ljust(key_widths[i]))
                    for i, col in enumerate(keys)
                ),
                "||",
                "|".join(
                    " {} ".format(col.ljust(prob_widths[i]))
                    for i, col in enumerate(probs)
                ),
                "|",
            ]))
        return "\n".join(result)

    def posterior_string(self):
        result = []
        values_header = tuple("P({})".format(value) for value in self.values)
        probs = tuple("{:.2f}%".format(float(100 * self.posterior[value])) for value in self.values)
        prob_widths = tuple(max(len(row[col]) for row in (values_header, probs)) for col in range(len(self.values)))
        result.append(self.name)
        result.append("".join([
            "|",
            "|".join(
                " {} ".format(col.ljust(prob_widths[i]))
                for i, col in enumerate(values_header)
            ),
            "|",
        ]))
        result.append("".join([
            "|",
            "|".join((width + 2) * "=" for width in prob_widths),
            "|",
        ]))
        result.append(
            "|{}|".format("|".join(" {} ".format(col.ljust(prob_widths[i]))
            for i, col in enumerate(probs)))
        )
        return "\n".join(result)


class BayesNet:

    def __init__(self, text):
        self.text = tuple(line.strip().lower() for line in text.splitlines())
        self.nodes = {}
        self.error = None
        try:
            self._parse()
        except SyntaxError:
            return

    def _error(self, message):
        self.error = "Error: " + message
        raise SyntaxError(message)

    def _parse(self):
        # parse all edges first
        for line in self.text:
            if "->" in line:
                self._parse_edge(line)
        # order nodes by depth
        self._check_dag()
        # find CPTs for nodes
        for node in sorted(self.nodes.values(), key=(lambda n: (n.depth, n.name))):
            self._parse_CPT(node.name)
        observations = {}
        # find all observed nodes
        predict = False
        for line in self.text:
            if line.startswith("observe "):
                words = line.split()
                if len(words) == 4:
                    if words[1] not in self.nodes:
                        self._error("There is no \"{}\" to be observed.".format(words[1]))
                    if words[3] not in self.nodes[words[1]].values:
                        self._error("\"{}\" is not a valid observation of \"{}\".".format(words[3], words[1]))
                    observations[words[1]] = words[3]
                    predict = True
        if "predict" in self.text:
            predict = True
        if predict:
            self.infer(observations)

    def _parse_edge(self, line):
        nodes = tuple(node.strip() for node in line.split("->"))
        if len(nodes) > 2:
            self._error("Error: I don't understand the line \"{}\"".format(line))
        else:
            parent_name, child_name = (node.strip() for node in nodes)
            if parent_name not in self.nodes:
                self.nodes[parent_name] = Node(parent_name)
            if child_name not in self.nodes:
                self.nodes[child_name] = Node(child_name)
            parent = self.nodes[parent_name]
            child = self.nodes[child_name]
            parent.children.add(child)
            child.parents.append(parent)

    def _parse_CPT(self, node_name):
        cpt_lines = [num for num, line in enumerate(self.text) if line.strip(":") == "cpt for {}".format(node_name)]
        if not cpt_lines:
            self._error("No CPT for \"{}\" given".format(node_name))
        elif len(cpt_lines) > 1:
            self._error("Multiple CPTs for \"{}\" given".format(node_name))
        node = self.nodes[node_name]
        line_num = cpt_lines[0]
        try:
            headers = self.text[line_num + 1].split()
        except IndexError:
            self._error("No CPT for \"{}\" given".format(node_name))
        parents = node.parents
        parent_names = set(parent.name for parent in parents)
        if not parent_names < set(headers):
            self._error(
                "The CPT for \"{}\" is missing input columns for \"{}\"".format(
                    node.name, "\", \"".join(sorted(parent_names - set(headers)))
                )
            )
        header_parents = headers[:len(parents)]
        header_probs = headers[len(parents):]
        if set(header_parents) != parent_names:
            self._error(
                "The CPT for \"{}\" has extra input columns for \"{}\"".format(
                    node.name, "\", \"".join(sorted(set(header_parents) - parent_names))
                )
            )
        if len(header_probs) < 2:
            self._error(
                "There are not enough values for \"{}\" in its CPT header (at least two needed).".format(node.name)
            )
        node.values = headers[len(parents):]
        num_rows = my_product(len(self.nodes[parent_name].values) for parent_name in header_parents)
        for line_diff in range(num_rows):
            try:
                row = self.text[line_num + line_diff + 2]
            except IndexError:
                self._error("The CPT for \"{}\" does not contain enough rows.".format(node.name))
            data = row.split()
            if len(data) != len(header_parents) + len(node.values):
                self._error(
                    "Row {} of the CPT for \"{}\" has {} columns than expected from the header".format(
                        line_diff + 1,
                        node.name,
                        ("more" if len(data) > len(header_parents) + len(node.values) else "fewer")))
            key = tuple(zip(header_parents, data[:len(header_parents)]))
            for parent_name, value in key:
                if value not in self.nodes[parent_name].values:
                    self._error(
                        "\"{}\" is not a valid value of \"{}\" in row {} of the CPT for \"{}\"".format(
                            value,
                            parent_name,
                            line_diff + 1,
                            node.name))
            if key in node.cpt:
                self._error(
                    "The probabilities for \"{}\" when ({}) has been specified twice".format(
                        node.name,
                        ", ".join("{} is {}".format(parent, value) for parent, value in key)))
            try:
                probs = tuple(zip(header_probs, (Fraction(datum) for datum in data[len(header_parents):])))
            except ValueError:
                self._error(
                    "Row {} of the CPT for \"{}\" contains an invalid probability".format(
                        line_diff + 1,
                        node.name))
            if not all(0 <= prob[1] <= 1 for prob in probs):
                self._error(
                    "Probabilities must be between 0 and 1 in row {} of the CPT for \"{}\"".format(
                        line_diff + 1,
                        node_name))
            if sum(prob[1] for prob in probs) != 1:
                self._error(
                    "The probabilities of row {} of the CPT for \"{}\" do not add up to 1 ({})".format(
                        line_diff + 1,
                        node_name,
                        ("{} = {}".format(" + ".join(str(prob[1]) for prob in probs), sum(prob[1] for prob in probs)))))
            node.cpt.append((key, probs))
        return line_num + num_rows + 1

    def _check_dag(self):
        # order nodes topologically for reading CPTs
        level = set(node for node in self.nodes.values() if len(node.parents) == 0)
        visited = set()
        while level:
            new_level = set()
            for parent in level:
                if parent.depth > len(self.nodes):
                    self._error("There is a loop in the Bayesian network")
                for child in parent.children:
                    child.depth = parent.depth + 1
                    new_level.add(child)
                visited.add(parent)
            level = new_level

    @property
    def has_errors(self):
        return self.error is not None

    def infer(self, evidence):
        # reset all nodes
        for node in self.nodes.values():
            node.reset()
        # record new observations
        for node_name, value in evidence.items():
            self.nodes[node_name].observe(value)
        # infer posterior for all nodes
        for node in self.nodes.values():
            if node.name not in evidence:
                node.posterior = self._infer(node, evidence)

    def _infer(self, query, evidence):
        evidence = dict((self.nodes[name], value) for name, value in evidence.items())
        queue = [query,] + list(evidence.keys())
        relevant_nodes = set(queue)
        while queue:
            node = queue.pop(0)
            queue.extend(parent for parent in node.parents if parent not in relevant_nodes)
            relevant_nodes.update(node.parents)
        unobserved_nodes = sorted(
            set(node for node in relevant_nodes
                if node.name != query.name and node not in evidence),
            key=(lambda n: n.name))
        result = {}
        for value in query.values:
            sigma = 0
            for assignment in product(*(node.values for node in unobserved_nodes)):
                assignment = dict(zip(unobserved_nodes, assignment))
                assignment.update(evidence)
                assignment[query] = value
                pi = 1
                for node in relevant_nodes:
                    key = tuple(
                        (parent.name, assignment[parent])
                        for parent in sorted(node.parents, key=(lambda n: n.name))
                    )
                    pi *= dict(dict((tuple(sorted(key)), value) for key, value in node.cpt)[key])[assignment[node]]
                sigma += pi
            result[value] = sigma
        total = sum(result.values())
        if total == 0:
            self._error('The observations are statistically impossible (have posterior probability of 0%)')
        for key in result:
            result[key] /= total
        return result

    def dot(self):
        result = []
        result.append('digraph {')
        for node in sorted(self.nodes.values(), key=(lambda node: (node.depth, node.name))):
            result.append('    subgraph "_{}" {{'.format(node.name))
            result.append('        rank=same')
            result.append('        "{}"'.format(node.name))
            if node.posterior:
                if node.observation is not None:
                    result.append(
                        '        "{}_cpt" [shape=box, fontname=Courier, penwidth=3, label="{}"]'.format(
                            node.name, node.observation
                        )
                    )
                else:
                    result.append(
                        '        "{}_cpt" [shape=box, fontname=Courier, label=\"{}\"]'.format(
                            node.name,
                            node.posterior_string().replace("\n", "\\n")
                        )
                    )
            else:
                result.append(
                    '        "{}_cpt" [shape=box, fontname=Courier, label=\"{}\"]'.format(
                        node.name,
                        node.cpt_string().replace("\n", "\\n")
                    )
                )
            result.append('        "{}" -> "{}_cpt" [style=invis]'.format(node.name, node.name))
            result.append('    }')
        for node in sorted(self.nodes.values(), key=(lambda node: (node.depth, node.name))):
            for child in node.children:
                result.append('    "{}" -> "{}"'.format(node.name, child.name))
        result.append('}')
        return "\n".join(result)
