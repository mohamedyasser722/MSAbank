import { Module, Controller, Post, Body, Get, Param, BadRequestException, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// --- 1. Database Entities ---
@Entity('users')
class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    balance: number;
}

@Entity('audit_logs')
class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    timestamp: Date;

    @Column()
    username: string;

    @Column()
    action: string;

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column()
    status: string; // SUCCESS, FAILURE
}

@Entity('loans')
class Loan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column()
    status: string; // PENDING, APPROVED, REJECTED, PAID

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
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

class LoanDto {
    username: string;
    amount: number;
}

// --- 3. Service (Business Logic) ---
@Injectable()
class AppService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
        @InjectRepository(Loan)
        private loanRepository: Repository<Loan>,
    ) { }

    private async log(username: string, action: string, status: string, details?: string) {
        const entry = this.auditRepository.create({
            username,
            action,
            status,
            details,
            timestamp: new Date(),
        });
        await this.auditRepository.save(entry);
    }

    async register(dto: AuthDto) {
        const exists = await this.userRepository.findOne({ where: { username: dto.username } });
        if (exists) {
            await this.log(dto.username, 'REGISTER', 'FAILURE', 'User already exists');
            throw new BadRequestException('User already exists');
        }

        const newUser = this.userRepository.create({
            username: dto.username,
            password: dto.password,
            balance: 1000, // Welcome bonus for demo
        });

        const savedUser = await this.userRepository.save(newUser);
        await this.log(dto.username, 'REGISTER', 'SUCCESS', 'Account created with $1000 bonus');
        return {
            message: 'User registered',
            user: { username: savedUser.username, balance: Number(savedUser.balance) }
        };
    }

    async login(dto: AuthDto) {
        const user = await this.userRepository.findOne({
            where: { username: dto.username, password: dto.password }
        });

        if (!user) {
            await this.log(dto.username, 'LOGIN', 'FAILURE', 'Invalid credentials');
            throw new BadRequestException('Invalid credentials');
        }

        await this.log(dto.username, 'LOGIN', 'SUCCESS');
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

        await this.log(dto.username, 'DEPOSIT', 'SUCCESS', `Amount: ${dto.amount}`);
        return { balance: Number(user.balance) };
    }

    async withdraw(dto: TransactionDto) {
        const user = await this.userRepository.findOne({ where: { username: dto.username } });
        if (!user) throw new BadRequestException('User not found');

        if (Number(user.balance) < Number(dto.amount)) {
            await this.log(dto.username, 'WITHDRAW', 'FAILURE', `Insufficient funds: ${dto.amount}`);
            throw new BadRequestException('Insufficient funds');
        }

        user.balance = Number(user.balance) - Number(dto.amount);
        await this.userRepository.save(user);

        await this.log(dto.username, 'WITHDRAW', 'SUCCESS', `Amount: ${dto.amount}`);
        return { balance: Number(user.balance) };
    }

    async requestLoan(dto: LoanDto) {
        const user = await this.userRepository.findOne({ where: { username: dto.username } });
        if (!user) throw new BadRequestException('User not found');

        // Simple scoring: loan amount < 5x current balance
        const maxLoan = Number(user.balance) * 5;
        const status = dto.amount <= maxLoan ? 'APPROVED' : 'REJECTED';

        const loan = this.loanRepository.create({
            username: dto.username,
            amount: dto.amount,
            status: status
        });

        await this.loanRepository.save(loan);

        if (status === 'APPROVED') {
            user.balance = Number(user.balance) + Number(dto.amount);
            await this.userRepository.save(user);
        }

        await this.log(dto.username, 'LOAN_REQUEST', status, `Amount: ${dto.amount}`);
        return { status, balance: Number(user.balance), loanId: loan.id };
    }

    async getHistory(username: string) {
        return this.auditRepository.find({
            where: { username },
            order: { timestamp: 'DESC' },
            take: 10
        });
    }

    async getBalance(username: string) {
        const user = await this.userRepository.findOne({ where: { username } });
        return { balance: user ? Number(user.balance) : 0 };
    }
}

// --- 4. Controller (API Endpoints) ---
@Controller()
class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    getHello() {
        return { message: 'Cloud-Native Bank Core API is running' };
    }

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

    @Post('account/loan')
    requestLoan(@Body() body: LoanDto) {
        return this.appService.requestLoan(body);
    }

    @Get('account/:username')
    getBalance(@Param('username') username: string) {
        return this.appService.getBalance(username);
    }

    @Get('account/:username/history')
    getHistory(@Param('username') username: string) {
        return this.appService.getHistory(username);
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
            entities: [User, AuditLog, Loan],
            synchronize: true,
        }),
        TypeOrmModule.forFeature([User, AuditLog, Loan]),
    ],
    controllers: [AppController],
    providers: [AppService],
})
class AppModule { }

// --- 6. Bootstrap (Start Server) ---
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: [
            'http://localhost:5173', // Local development
            'https://app-bank.mashaheir.com', // Production frontend
        ],
        credentials: true,
    });
    await app.listen(3000, '0.0.0.0');
    console.log(`Backend is running on: http://localhost:3000`);
}

bootstrap();

