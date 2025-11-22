import { Module, Controller, Post, Body, Get, Param, BadRequestException, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// --- 1. Database Entity ---
@Entity('users')
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;
}

// --- 2. Data Types (DTOs) ---
class AuthDto {
  username: string;
  password?: string;
}

class TransactionDto {
  username: string;
  amount: number;
}

// --- 3. Service (Business Logic) ---
@Injectable()
class AppService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(dto: AuthDto) {
    const exists = await this.userRepository.findOne({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('User already exists');
    
    const newUser = this.userRepository.create({
      username: dto.username,
      password: dto.password,
      balance: 0,
    });
    
    const savedUser = await this.userRepository.save(newUser);
    return { 
      message: 'User registered', 
      user: { username: savedUser.username, balance: Number(savedUser.balance) } 
    };
  }

  async login(dto: AuthDto) {
    const user = await this.userRepository.findOne({ 
      where: { username: dto.username, password: dto.password } 
    });
    
    if (!user) throw new BadRequestException('Invalid credentials');
    
    return { 
      message: 'Login successful', 
      user: { username: user.username, balance: Number(user.balance) } 
    };
  }

  async deposit(dto: TransactionDto) {
    const user = await this.userRepository.findOne({ where: { username: dto.username } });
    if (!user) throw new BadRequestException('User not found');
    
    user.balance = Number(user.balance) + Number(dto.amount);
    await this.userRepository.save(user);
    
    return { balance: Number(user.balance) };
  }

  async withdraw(dto: TransactionDto) {
    const user = await this.userRepository.findOne({ where: { username: dto.username } });
    if (!user) throw new BadRequestException('User not found');
    
    if (Number(user.balance) < Number(dto.amount)) {
      throw new BadRequestException('Insufficient funds');
    }
    
    user.balance = Number(user.balance) - Number(dto.amount);
    await this.userRepository.save(user);
    
    return { balance: Number(user.balance) };
  }

  async getBalance(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    return { balance: user ? Number(user.balance) : 0 };
  }
}

// --- 4. Controller (API Endpoints) ---
@Controller()
class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('auth/register')
  register(@Body() body: AuthDto) { 
    return this.appService.register(body); 
  }

  @Post('auth/login')
  login(@Body() body: AuthDto) { 
    return this.appService.login(body); 
  }

  @Post('account/deposit')
  deposit(@Body() body: TransactionDto) { 
    return this.appService.deposit(body); 
  }

  @Post('account/withdraw')
  withdraw(@Body() body: TransactionDto) { 
    return this.appService.withdraw(body); 
  }

  @Get('account/:username')
  getBalance(@Param('username') username: string) { 
    return this.appService.getBalance(username); 
  }
}

// --- 5. Module (Wiring it up) ---
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'mysql',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      database: process.env.DB_DATABASE || 'bankdb',
      entities: [User],
      synchronize: true, // Auto-create tables (use migrations in production)
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

// --- 6. Bootstrap (Start Server) ---
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Allow React frontend to access
  await app.listen(3000);
  console.log(`Backend is running on: http://localhost:3000`);
}

bootstrap();

