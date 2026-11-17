import io
import json
import unittest
from email.message import Message
from unittest.mock import patch

from api.greedy import handler
from backend.greedy import AnalysisLimitError, greedy_match


class GreedyTests(unittest.TestCase):
    def assert_disjoint(self, result, a, b):
        seen_a, seen_b = set(), set()
        for block in result['blocks']:
            i, j, length = block['a_start'], block['b_start'], block['length']
            ra, rb = set(range(i, i + length)), set(range(j, j + length))
            self.assertFalse(seen_a & ra)
            self.assertFalse(seen_b & rb)
            self.assertEqual(a[i:i + length], b[j:j + length])
            seen_a.update(ra)
            seen_b.update(rb)
        self.assertLessEqual(result['coverage'], 100)

    def test_identical(self):
        result = greedy_match(list('abcdef'), list('abcdef'), 3)
        self.assertEqual(result['coverage'], 100)
        self.assertEqual(result['blocks'], [{'a_start': 0, 'b_start': 0, 'length': 6}])

    def test_different_empty_and_short(self):
        for a, b in [([], []), (list('ab'), list('ab')), (list('abc'), list('xyz'))]:
            self.assertEqual(greedy_match(a, b, 3)['coverage'], 0)

    def test_repeated_tokens_are_not_reused(self):
        a, b = list('abcabc'), list('abc')
        result = greedy_match(a, b, 3)
        self.assertEqual(result['matched_tokens'], 3)
        self.assertEqual(result['coverage'], 66.7)
        self.assert_disjoint(result, a, b)

    def test_reordered_blocks(self):
        a, b = list('abcXdef'), list('defYabc')
        result = greedy_match(a, b, 3)
        self.assertEqual(result['matched_tokens'], 6)
        self.assert_disjoint(result, a, b)

    def test_validation(self):
        for a, b, k in [(None, [], 3), ([1], [], 3), ([''], [], 3), (['x'] * 2001, [], 3), ([], [], True), ([], [], 4)]:
            with self.assertRaises(ValueError):
                greedy_match(a, b, k)

    def test_budget(self):
        with patch('backend.greedy.MAX_STEPS', 2):
            with self.assertRaises(AnalysisLimitError):
                greedy_match(list('abc'), list('abc'), 3)


class ApiTests(unittest.TestCase):
    def request(self, payload, content_type='application/json', length=None):
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        request = handler.__new__(handler)
        request.headers = Message()
        request.headers['Content-Type'] = content_type
        request.headers['Content-Length'] = str(len(body) if length is None else length)
        request.rfile = io.BytesIO(body)
        captured = []
        request.reply = lambda status, data: captured.append((status, data))
        request.do_POST()
        return captured[0]

    def test_success(self):
        status, data = self.request({'tokens_a': list('abc'), 'tokens_b': list('abc'), 'min_length': 3})
        self.assertEqual(status, 200)
        self.assertEqual(data['coverage'], 100)

    def test_invalid_requests(self):
        for payload in [b'{', [], {}, b'\xff']:
            self.assertEqual(self.request(payload)[0], 400)
        self.assertEqual(self.request({}, content_type='text/plain')[0], 415)
        self.assertEqual(self.request({}, length=600001)[0], 413)
        self.assertEqual(self.request({}, length='invalid')[0], 400)

    def test_analysis_budget(self):
        with patch('backend.greedy.MAX_STEPS', 2):
            self.assertEqual(self.request({'tokens_a': list('abc'), 'tokens_b': list('abc'), 'min_length': 3})[0], 422)


if __name__ == '__main__':
    unittest.main()
