import { Controller, Get, Param } from "@nestjs/common";
import { UserService } from "../services";

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @Get('/profile/:userId')
    async getUserProfile(@Param('userId') userId: string) {
        return this.userService.getUserDetailsForDashboard(userId);
    }
}

