import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger, defaultLogger } from '../logger';
import { createTimer, createTimerWithLogger, Timer } from '../timer';

// Mock 整个 logger 模块
vi.mock('../logger', { spy: true });

// Mock Date.now 用于精确控制时间
const mockDateNow = vi.fn();
vi.stubGlobal('Date', {
  ...Date,
  now: mockDateNow,
});

describe('Timer 类测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(1000); // 固定起始时间
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确创建 Timer 实例', () => {
      const logger = createLogger();
      const timer = new Timer('测试任务', logger);
      expect(timer).toBeInstanceOf(Timer);
    });

    it('应该在创建时开始计时', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const timer = new Timer('测试任务', logger);

      // 验证开始时间被记录
      expect(mockDateNow).toHaveBeenCalledTimes(1);

      // 验证初始状态
      expect(timer.duration).toBe(0);
    });
  });

  describe('duration getter', () => {
    it('应该返回动态计算的耗时', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const timer = new Timer('测试任务', logger);

      // 时间前进500ms
      mockDateNow.mockReturnValue(1500);
      expect(timer.duration).toBe(500);

      // 时间再前进300ms
      mockDateNow.mockReturnValue(1800);
      expect(timer.duration).toBe(800);
    });

    it('应该在结束后返回固定的耗时', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const timer = new Timer('测试任务', logger);

      // 时间前进500ms后结束
      mockDateNow.mockReturnValue(1500);
      timer.end();

      // 时间继续前进，但耗时应该固定
      mockDateNow.mockReturnValue(2000);
      expect(timer.duration).toBe(500);
    });
  });

  describe('end() 方法', () => {
    it('应该正确结束计时并输出日志', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');
      const timer = new Timer('测试任务', logger);

      // 时间前进500ms后结束
      mockDateNow.mockReturnValue(1500);
      timer.end();

      // 验证日志输出
      expect(infoSpy).toHaveBeenCalledWith('测试任务 耗时 500ms');
      expect(infoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在重复调用时只执行一次', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');
      const timer = new Timer('测试任务', logger);

      // 第一次结束
      mockDateNow.mockReturnValue(1500);
      timer.end();

      // 第二次结束
      mockDateNow.mockReturnValue(2000);
      timer.end();

      // 验证日志只输出一次
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith('测试任务 耗时 500ms');
    });

    it('应该在结束后固定 duration 值', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const timer = new Timer('测试任务', logger);

      mockDateNow.mockReturnValue(1300);
      timer.end();

      // 验证耗时固定为结束时的值
      expect(timer.duration).toBe(300);

      // 时间继续前进，但耗时保持不变
      mockDateNow.mockReturnValue(2000);
      expect(timer.duration).toBe(300);
    });
  });

  describe('与 Logger 的集成', () => {
    it('应该使用传入的 logger 输出日志', () => {
      const customLogger = createLogger({ prefix: '[自定义]' });
      const infoSpy = vi.spyOn(customLogger, 'info');

      mockDateNow.mockReturnValue(1000);
      const timer = new Timer('API调用', customLogger);

      mockDateNow.mockReturnValue(1750);
      timer.end();

      expect(infoSpy).toHaveBeenCalledWith('API调用 耗时 750ms');
    });

    it('应该正确处理不同的任务名称', () => {
      const taskNames = ['数据处理', '文件上传', 'API请求', '渲染组件'];
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');

      taskNames.forEach((name, index) => {
        mockDateNow.mockReturnValue(1000 + index * 100);
        const timer = new Timer(name, logger);

        mockDateNow.mockReturnValue(1000 + index * 100 + 50);
        timer.end();

        expect(infoSpy).toHaveBeenNthCalledWith(index + 1, `${name} 耗时 50ms`);
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理零耗时的情况', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');
      const timer = new Timer('瞬时任务', logger);

      // 同一时间结束
      mockDateNow.mockReturnValue(1000);
      timer.end();

      expect(infoSpy).toHaveBeenCalledWith('瞬时任务 耗时 0ms');
      expect(timer.duration).toBe(0);
    });

    it('应该处理长时间运行的任务', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');
      const timer = new Timer('长时间任务', logger);

      // 运行1小时（3600000ms）
      mockDateNow.mockReturnValue(1000 + 3600000);
      timer.end();

      expect(infoSpy).toHaveBeenCalledWith('长时间任务 耗时 3600000ms');
      expect(timer.duration).toBe(3600000);
    });

    it('应该处理特殊字符的任务名称', () => {
      const specialNames = ['任务@#$%', '测试&任务', '任务(1)', '任务[重要]'];
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');

      specialNames.forEach((name, index) => {
        mockDateNow.mockReturnValue(1000);
        const timer = new Timer(name, logger);

        mockDateNow.mockReturnValue(1100);
        timer.end();

        expect(infoSpy).toHaveBeenNthCalledWith(
          index + 1,
          `${name} 耗时 100ms`
        );
      });
    });
  });
});

describe('创建函数测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(1000);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createTimer', () => {
    it('应该创建使用默认logger的Timer实例', () => {
      const timer = createTimer('默认任务');
      expect(timer).toBeInstanceOf(Timer);
    });

    it('应该使用默认logger输出日志', () => {
      const infoSpy = vi.spyOn(defaultLogger, 'info');

      mockDateNow.mockReturnValue(1000);
      const timer = createTimer('默认任务');

      mockDateNow.mockReturnValue(1200);
      timer.end();

      expect(infoSpy).toHaveBeenCalledWith('默认任务 耗时 200ms');
    });
  });

  describe('createTimerWithLogger', () => {
    it('应该创建使用自定义logger的Timer实例', () => {
      const logger = createLogger();
      const timer = createTimerWithLogger('自定义任务', logger);
      expect(timer).toBeInstanceOf(Timer);
    });

    it('应该使用传入的logger输出日志', () => {
      mockDateNow.mockReturnValue(1000);
      const logger = createLogger();
      const infoSpy = vi.spyOn(logger, 'info');
      const timer = createTimerWithLogger('自定义任务', logger);

      mockDateNow.mockReturnValue(1350);
      timer.end();

      expect(infoSpy).toHaveBeenCalledWith('自定义任务 耗时 350ms');
    });

    it('应该支持不同的logger配置', () => {
      const logger1 = createLogger({ prefix: '[API]' });
      const logger2 = createLogger({ prefix: '[DB]' });

      const spy1 = vi.spyOn(logger1, 'info');
      const spy2 = vi.spyOn(logger2, 'info');

      mockDateNow.mockReturnValue(1000);
      const timer1 = createTimerWithLogger('API任务', logger1);
      const timer2 = createTimerWithLogger('DB任务', logger2);

      mockDateNow.mockReturnValue(1100);
      timer1.end();
      timer2.end();

      expect(spy1).toHaveBeenCalledWith('API任务 耗时 100ms');
      expect(spy2).toHaveBeenCalledWith('DB任务 耗时 100ms');
    });
  });
});

describe('实际使用场景测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(1000);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('应该支持典型的性能监控场景', () => {
    const performanceLogger = createLogger({
      prefix: '[性能监控]',
      level: 0, // DEBUG 级别
    });
    const infoSpy = vi.spyOn(performanceLogger, 'info');

    // 模拟数据处理任务
    mockDateNow.mockReturnValue(1000);
    const timer = createTimerWithLogger('数据处理', performanceLogger);

    // 检查中间进度
    mockDateNow.mockReturnValue(1250);
    expect(timer.duration).toBe(250);

    // 任务完成
    mockDateNow.mockReturnValue(1500);
    timer.end();

    expect(infoSpy).toHaveBeenCalledWith('数据处理 耗时 500ms');
  });

  it('应该支持多个并发计时器', () => {
    const timers = [
      createTimer('任务1'),
      createTimer('任务2'),
      createTimer('任务3'),
    ];

    // 在不同时间结束各个任务
    mockDateNow.mockReturnValue(1100);
    timers[0].end();

    mockDateNow.mockReturnValue(1200);
    timers[1].end();

    mockDateNow.mockReturnValue(1300);
    timers[2].end();

    // 每个计时器应该有独立的耗时
    expect(timers[0].duration).toBe(100);
    expect(timers[1].duration).toBe(200);
    expect(timers[2].duration).toBe(300);
  });
});
