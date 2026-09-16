import importlib.util
import sys
import types
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


class FakeAction:
    def __init__(self, **values):
        self.__dict__.update(values)


class FakeObservation:
    @classmethod
    def from_text(cls, text):
        return SimpleNamespace(text=text)


class FakeConversation:
    def __init__(self, *args, **kwargs):
        self.sent = []
        self.runs = 0
        self.state = SimpleNamespace(events=[])

    def send_message(self, message):
        self.sent.append(message)

    def run(self):
        self.runs += 1


class FakeToolDefinition:
    def __class_getitem__(cls, _):
        return cls


class FakeToolExecutor:
    def __class_getitem__(cls, _):
        return cls


class FakeFastAPI:
    def __init__(self, **_):
        pass

    def add_middleware(self, *_args, **_kwargs):
        pass

    def get(self, *_args, **_kwargs):
        return lambda fn: fn

    def post(self, *_args, **_kwargs):
        return lambda fn: fn


class FakeBaseModel:
    def __init__(self, **values):
        self.__dict__.update(values)


class AssistantServiceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sdk = types.ModuleType("openhands.sdk")
        sdk.LLM = object
        sdk.Action = FakeAction
        sdk.Agent = object
        sdk.Conversation = FakeConversation
        sdk.LLMConvertibleEvent = type("LLMConvertibleEvent", (), {})
        sdk.Observation = FakeObservation
        sdk.ToolDefinition = FakeToolDefinition

        sdk_tool = types.ModuleType("openhands.sdk.tool")
        sdk_tool.Tool = lambda **kwargs: kwargs
        sdk_tool.ToolExecutor = FakeToolExecutor
        sdk_tool.register_tool = lambda *_args, **_kwargs: None

        openhands = types.ModuleType("openhands")
        openhands.sdk = sdk

        pydantic = types.ModuleType("pydantic")
        pydantic.BaseModel = FakeBaseModel
        pydantic.Field = lambda default=None, **_kwargs: default
        pydantic.SecretStr = str

        fastapi = types.ModuleType("fastapi")
        fastapi.FastAPI = FakeFastAPI
        middleware = types.ModuleType("fastapi.middleware")
        cors = types.ModuleType("fastapi.middleware.cors")
        cors.CORSMiddleware = object

        cls._modules = {
            "openhands": openhands,
            "openhands.sdk": sdk,
            "openhands.sdk.tool": sdk_tool,
            "pydantic": pydantic,
            "fastapi": fastapi,
            "fastapi.middleware": middleware,
            "fastapi.middleware.cors": cors,
        }
        cls._old_modules = {name: sys.modules.get(name) for name in cls._modules}
        sys.modules.update(cls._modules)

        path = Path(__file__).with_name("champey_assistant.py")
        spec = importlib.util.spec_from_file_location("champey_assistant_tested", path)
        cls.service = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.service
        spec.loader.exec_module(cls.service)

    @classmethod
    def tearDownClass(cls):
        for name, old in cls._old_modules.items():
            if old is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = old
        sys.modules.pop("champey_assistant_tested", None)

    def setUp(self):
        self.service._SESSIONS.clear()
        self.service.AGENT = object()
        self.service.LLM_INSTANCE = SimpleNamespace(metrics=SimpleNamespace(accumulated_cost=0.25))

    def test_each_skill_maps_to_its_contract(self):
        self.assertEqual(
            self.service._ACTION_TO_SKILL,
            {
                "SearchProductsAction": "product_search",
                "BrowseFeedAction": "feed",
                "SearchJobsAction": "jobs",
                "GetResumeTemplatesAction": "resume",
            },
        )

    def test_language_and_manual_skill_override_are_encoded(self):
        self.assertEqual(
            self.service._build_user_message("ស្វែងរក", "km", "jobs"),
            "Reply in Khmer (ភាសាខ្មែរ).\nFor this request, use the 'jobs' skill.\nស្វែងរក",
        )
        self.assertEqual(
            self.service._build_user_message("find work", "en", "auto"),
            "Reply in English.\nfind work",
        )

    def test_session_is_reused_and_reset_removes_it(self):
        first = self.service._get_session("user-1")
        second = self.service._get_session("user-1")
        self.assertIs(first, second)

        result = self.service.reset(SimpleNamespace(session_id="user-1"))
        self.assertEqual(result, {"ok": True})
        self.assertIsNot(first, self.service._get_session("user-1"))

    def test_each_skill_selects_chat_path_and_executes_its_tool(self):
        cases = [
            (
                "product_search",
                "find a phone",
                self.service.SearchProductsExecutor,
                FakeAction(
                    query="phone",
                    category_id=None,
                    min_price=None,
                    max_price=None,
                    condition=None,
                    sort=None,
                    in_stock=None,
                ),
                {"/search": {"products": []}, "/categories": []},
                "Search results:",
            ),
            (
                "feed",
                "suggest feed ideas",
                self.service.BrowseFeedExecutor,
                FakeAction(topic="crafts"),
                {"/suggestions": [], "/stories": []},
                "Suggested accounts:",
            ),
            (
                "jobs",
                "find work",
                self.service.SearchJobsExecutor,
                FakeAction(query="designer", location=None, type=None),
                {"/jobs": []},
                "Jobs:",
            ),
            (
                "resume",
                "improve my resume",
                self.service.GetResumeTemplatesExecutor,
                FakeAction(role="designer"),
                {"/resumes": []},
                "Resume templates:",
            ),
        ]

        for index, (skill, message, executor_type, action, responses, label) in enumerate(cases):
            with self.subTest(skill=skill):
                session_id = f"skill-{index}"
                conversation = FakeConversation()
                self.service._SESSIONS[session_id] = {
                    "conversation": conversation,
                    "messages": [],
                }
                request = SimpleNamespace(
                    message=message,
                    language="en",
                    session_id=session_id,
                    skill=skill,
                )

                with patch.object(self.service, "_extract_reply", return_value=f"Live {skill}"), patch.object(
                    self.service,
                    "http_get",
                    side_effect=lambda path, params=None, timeout=15.0: responses[path],
                ):
                    result = self.service.chat(request)
                    observation = executor_type()(action)

                self.assertEqual(result["reply"], f"Live {skill}")
                self.assertEqual(result["skill"], skill)
                self.assertEqual(conversation.sent, [f"Reply in English.\nFor this request, use the '{skill}' skill.\n{message}"])
                self.assertEqual(conversation.runs, 1)
                self.assertIn(label, observation.text)

    def test_not_configured_and_failed_requests_return_errors(self):
        self.service.AGENT = None
        not_configured = self.service.chat(SimpleNamespace(message="hi", language="en", session_id="x", skill=None))
        self.assertEqual(not_configured["error"], "not_configured")

        class FailedConversation(FakeConversation):
            def run(self):
                raise RuntimeError("offline")

        self.service.AGENT = object()
        self.service._SESSIONS["x"] = {"conversation": FailedConversation(), "messages": []}
        failed = self.service.chat(SimpleNamespace(message="hi", language="en", session_id="x", skill=None))
        self.assertEqual(failed["error"], "run_failed")

    def test_failed_or_malformed_backend_response_is_reported_without_writing(self):
        for error, expected in [
            (OSError("backend unavailable"), "backend unavailable"),
            (ValueError("invalid JSON"), "invalid JSON"),
        ]:
            with self.subTest(error=type(error).__name__), patch.object(
                self.service, "http_get", side_effect=error
            ):
                result = self.service.SearchJobsExecutor()(
                    FakeAction(query="designer", location=None, type=None)
                )

            self.assertIn(f"Jobs request failed: {expected}", result.text)

    def test_tools_use_only_read_only_get_api_paths(self):
        calls = []

        def fake_get(path, params=None, timeout=15.0):
            calls.append((path, params))
            return {"path": path}

        with patch.object(self.service, "http_get", side_effect=fake_get):
            self.service.SearchProductsExecutor()(
                FakeAction(query="phone", category_id=None, min_price=None, max_price=None, condition=None, sort=None, in_stock=None)
            )
            self.service.BrowseFeedExecutor()(FakeAction(topic="crafts"))
            self.service.SearchJobsExecutor()(FakeAction(query="designer", location=None, type=None))
            self.service.GetResumeTemplatesExecutor()(FakeAction(role="designer"))

        self.assertEqual(
            [path for path, _params in calls],
            ["/search", "/categories", "/suggestions", "/stories", "/jobs", "/resumes"],
        )
        self.assertTrue(all(not path.startswith(("/post", "/put", "/patch", "/delete")) for path, _ in calls))


if __name__ == "__main__":
    unittest.main()
