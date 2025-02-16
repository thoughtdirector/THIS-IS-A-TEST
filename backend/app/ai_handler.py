
import google.generativeai as genai
import json
import dotenv



def generate(messages, prompt, schema=None, model_str="gemini-1.5-flash-002"):
    role_map = {"user":"user", "assistant":"model", "system":"user"}
    #genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash-002') #make it accept an arbitrary model after, with a model factory or something
    msgs = []
    for m in messages:
        if any(f not in m for f in ["role", "content"]):
            raise ValueError(f"Invalid message format: {m}")
        msgs.append({"role":role_map.get(m.get("role")), "parts":str(m.get("content"))}) #maybe format dict for llm usage instead of str()

    model = genai.GenerativeModel(model_str)
    chat = model.start_chat(
        history=msgs
    )
    if schema:
      response = chat.send_message(
          prompt,
          generation_config=genai.GenerationConfig(
              response_mime_type="application/json",
              response_schema = schema),

      )

      content = json.loads(response.candidates[0].content.parts[0].text)
    else:
        
      response = chat.send_message(
          prompt,
      )

      content = response.candidates[0].content.parts[0].text
        
    
    return {"response":response, "content":content}

objective_question_schema = {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "description": "The type of data the user must input"
      },
      "field": {
        "type": "string",
        "description": "The name of the field to ask the question"
      },
      "label": {
        "type": "string",
        "description": "The label of the question to show the user"
      },
      "description": {
        "type": "string",
        "description": "A description of the question"
      }
    },
    "required": ["type", "field", "label", "description"]
  }
}


task_schema = {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "task_id": {
        "type": "string",
        "description": "Unique identifier for the task"
      },
      "task_name": {
        "type": "string",
        "description": "Clear and concise name of the task"
      },
      "priority": {
        "type": "integer",
        "description": "Priority level of the task (1-5, where 1 is highest)",
      },
      "difficulty": {
        "type": "string",
        "enum": ["Easy", "Medium", "Hard"],
        "description": "Estimated difficulty level of the task"
      },
      "category": {
        "type": "string",
        "description": "Category or label for the task (e.g., 'Research', 'Development', 'Testing')"
      },
      "description": {
        "type": "string",
        "description": "Detailed description of the task and its objectives"
      },
      "estimated_duration": {
        "type": "object",
        "properties": {
          "value": {
            "type": "number",
            "description": "Estimated time to complete the task"
          },
          "unit": {
            "type": "string",
            "enum": ["hours", "days", "weeks"],
            "description": "Time unit for the estimated duration"
          }
        },
        "required": ["value", "unit"]
      },
      "dependencies": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the dependency"
            },
          },
        }
      },
      "resources_needed": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the required resource"
            },
            "type": {
              "type": "string",
              "enum": ["Agent", "Equipment", "Software", "Data", "Other"],
              "description": "Type of resource needed. "
            },
            "description": {
              "type": "string",
              "description": "Detailed description of the required resource"
            }
          },
          "required": ["name", "type", "description"]
        }
      },
      "acceptance_criteria": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "criteria": {
              "type": "string",
              "description": "Specific criteria that must be met for the task to be considered complete"
            },
            "measure_type": {
              "type": "string",
              "description": "Type of measure that is used to validate the acceptance criteria"
            },
            "difficulty": {
              "type": "string",
              "enum": ["hard", "medium", "easy"],
              "description": "Difficulty of measuring the acceptance criteria"
            },
          },
        }
      }
    },
    "required": ["task_id", "task_name", "priority", "difficulty", "category", "description", "estimated_duration", "resources_needed", "acceptance_criteria"]
  }
}
    
    

def generate_objective_questions(messages):
  

    prompt = """As a friendly project manager you will now generate a JSON list with different information to be filled in order to gather all the necessary information from the user to complete the project. You will create various questions to gather all the information from the user. 
The user is just starting this project, so they might not have a lot of information about it. Do not ask for steps or tasks to complete the project, as those will be discussed later
Ask for absolutely necessary information that could help create tasks to complete the project later. 
Focus on asking about goals, impact, or any other motivation to complete the project. 
Ask very simple questions that can help obtain more information about the project. As it is a project starter ask them in a simple way. If a somewhat technical question must be asked, such as budget, phrase it in an easier way.
You may ask for the following types of information: Text
Each entry in the json will be a dictionary with the following keys: 
        type: The type of data the user must input (Text)
        field: The name of the field to ask the question
        label: The label of the question to show the user
        description: A description of the question
    """
    return generate(messages, prompt, schema = objective_question_schema )




def generate_tasks(messages):
    prompt = """As a highly skilled project manager, your task is to generate a detailed JSON list of tasks required to complete the given project. Each task should be thoroughly described and include all necessary information as per the provided schema. Follow these guidelines:

    1. Analyze the project requirements carefully before creating the task list.
    2. Break down the project into logical, manageable tasks.
    3. Ensure each task has a unique ID and a clear, concise name.
    4. Assign appropriate priority levels and difficulty ratings to each task.
    5. Categorize tasks to group related activities.
    6. Provide detailed descriptions for each task, explaining what needs to be done and why.
    7. Estimate the duration for each task realistically.
    8. Identify and list any dependencies between tasks.
    9. Specify the resources needed for each task, including agents (personnel), equipment, software, or data. Be very specific in the description in each task. If an agent or personnel is needed, be very specific about their role.
    10. Define clear acceptance criteria for each task to ensure quality and completeness.
    11. Consider potential risks or challenges for complex tasks and include them in the description.
    12. Ensure the task list covers all aspects of the project, including planning, execution, and delivery phases.
   

    Generate a comprehensive task list that will serve as a solid foundation for project execution. Be specific and thorough in your task descriptions to minimize ambiguity and maximize efficiency in project implementation.
    """
    return generate(messages, prompt, schema = task_schema ).get("content")