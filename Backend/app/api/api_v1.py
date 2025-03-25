from app.controllers import user_controller
api_router.include_router(user_controller.router)
