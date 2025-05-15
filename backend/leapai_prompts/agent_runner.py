import logging
import os
import re
import json


class AgentRunner:
    def __init__(self, system_prompt_file, llm_model=None, max_token=2048):
        self._llm_model = llm_model
        self._max_token = max_token
        full_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), system_prompt_file)
        try:
            with open(full_path, 'r', encoding='utf-8') as file:
                try:
                    self._prompt_dict = json.load(file)
                except json.JSONDecodeError:
                    logging.error(f"Error: The file {full_path} is not a valid JSON file.")
                    self._prompt_dict = {}
        except FileNotFoundError:
            logging.error(f"Error: The file {full_path} was not found.")
            self._prompt_dict = ""

    async def _chat(self, system, history, gen_conf):
        response = await self._llm_model.chat(system, history, gen_conf)
        response = re.sub(r"<think>.*</think>", "", response, flags=re.DOTALL)
        if response.find("**ERROR**") >= 0:
            raise Exception(response)

        return response

    async def __call__(self, **kwargs):
        gen_conf = {"temperature": 0.3, "max_tokens": self._max_token}
        user_prompt = {}
        user_prompt_format = self._prompt_dict["prompt"]["document_info"]
        for k, v in user_prompt_format.items():
            user_prompt[k] = v.format(**kwargs)

        messages = [{"role": "system", "content": json.dumps(self._prompt_dict, ensure_ascii=False)},
                    {"role": "system", "content": json.dumps(user_prompt, ensure_ascii=False)}]
        if self._llm_model is None:
            return json.dumps(messages, ensure_ascii=False)

        cnt = await self._chat("You're a helpful assistant.", messages, gen_conf)
        return cnt
